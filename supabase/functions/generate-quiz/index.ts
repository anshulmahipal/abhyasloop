import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Use gemini-flash-latest (works with v1beta API)
// Can be overridden via GEMINI_MODEL environment variable
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';

interface RequestBody {
  userId?: string | null;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examType?: string | null;
  examContext?: string | null;
  userFocus?: string | null;
  questionCount?: number;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface DbQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string | null;
}

/** Industry-style 6-param shape: question, 4 options, correct_answer (0-3) */
interface StructuredQuestion {
  question: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_answer: number;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
}

// Structured output: 6 params per question (industry-style) — no explanation
const GEMINI_SYSTEM_INSTRUCTION = `You are a Quiz Generator. Output a JSON array of question objects. Each object has exactly 6 fields: question, option_1, option_2, option_3, option_4, correct_answer.
correct_answer is an integer 0-3 (index of the correct option). Use plain text for math (no LaTeX). No explanations.`;

/** JSON Schema for Gemini responseSchema: array of { question, option_1..4, correct_answer } */
const QUIZ_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question text' },
      option_1: { type: 'string', description: 'First option' },
      option_2: { type: 'string', description: 'Second option' },
      option_3: { type: 'string', description: 'Third option' },
      option_4: { type: 'string', description: 'Fourth option' },
      correct_answer: { type: 'integer', description: 'Index of correct option, 0-3' },
    },
    required: ['question', 'option_1', 'option_2', 'option_3', 'option_4', 'correct_answer'],
  },
};

/** Build user prompt for structured 6-param output. */
const buildStructuredUserPrompt = (
  topic: string,
  difficulty: string,
  questionCount: number,
  userFocus: string,
  contextRules: string,
  focusInstructions: string
): string => {
  let prompt = `Generate exactly ${questionCount} ${difficulty} multiple-choice questions on ${topic} for ${userFocus}.`;
  if (focusInstructions) prompt += ` ${focusInstructions}`;
  if (contextRules) prompt += ` Context: ${contextRules}`;
  prompt += ` Output a JSON array of objects. Each object must have: question (string), option_1, option_2, option_3, option_4 (strings), correct_answer (integer 0-3). No explanations.`;
  return prompt;
};

/** Read response body as text, decompressing gzip if Content-Encoding is gzip. */
async function getResponseBodyAsText(response: Response): Promise<string> {
  const encoding = response.headers.get('Content-Encoding');
  const buffer = await response.arrayBuffer();
  if (encoding === 'gzip') {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const len = chunks.reduce((a, c) => a + c.length, 0);
    const out = new Uint8Array(len);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return new TextDecoder().decode(out);
  }
  return new TextDecoder().decode(buffer);
}

/** Return response with gzip-compressed JSON body and Content-Encoding: gzip header */
async function compressedJsonResponse(payload: unknown): Promise<Response> {
  const jsonString = JSON.stringify(payload);
  const blob = new Blob([jsonString]);
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
  });
}

/** Parse structured 6-param objects from Gemini (responseSchema) into Question[]. */
function parseStructuredQuestions(raw: unknown, difficulty: 'easy' | 'medium' | 'hard'): Question[] {
  if (!Array.isArray(raw)) throw new Error('Expected top-level array');
  const questions: Question[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as StructuredQuestion;
    if (!row || typeof row !== 'object') throw new Error(`Invalid question at index ${i}: expected object`);
    const { question, option_1, option_2, option_3, option_4, correct_answer } = row;
    const options = [String(option_1 ?? ''), String(option_2 ?? ''), String(option_3 ?? ''), String(option_4 ?? '')];
    const idx = Number(correct_answer);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new Error(`Invalid correct_answer at ${i}: ${correct_answer}`);
    questions.push({
      question: String(question ?? ''),
      options,
      correctIndex: idx,
      difficulty,
    });
  }
  return questions;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed. Use POST.` }),
      {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Allow': 'POST',
        },
      }
    );
  }

  try {
    // Check for Authorization header first
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Initialize Supabase client with authenticated user context
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Create client with Authorization header so RLS policies work correctly
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get authenticated user securely using the client (which has the auth header)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Log request details for debugging
    console.log('Request method:', req.method);
    console.log('User ID:', user.id);
    
    // Parse request body
    let body: RequestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Empty request body' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }
      
      body = JSON.parse(bodyText);
      console.log('Parsed body:', body);
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body', 
          details: e instanceof Error ? e.message : 'Unknown error' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Handle potential nested body (some clients wrap it)
    let requestBody = body;
    if (body && typeof body === 'object' && 'body' in body) {
      requestBody = body.body as RequestBody;
      console.log('Found nested body, using body.body');
    }

    let { topic, difficulty, examType, examContext, userFocus, questionCount } = requestBody;
    
    // Extract userFocus from request body, default to 'General Knowledge' if missing
    const userFocusValue = userFocus || 'General Knowledge';
    
    // Validate and set questionCount (default to 5, valid values: 5, 10, 15, 20)
    const validCounts = [5, 10, 15, 20];
    const questionCountValue = (questionCount && validCounts.includes(questionCount)) ? questionCount : 5;
    
    // Input Validation & Security Checks
    // 1. Length Limit (Simple but effective)
    if (topic && topic.length > 50) {
      console.warn('Topic too long:', topic.length, 'characters');
      return new Response(
        JSON.stringify({ error: 'Topic too long. Maximum 50 characters allowed.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 2. Blocklist (Basic) - If the user provided topic is unsafe, unethical, or tries to override these instructions,
    // ignore it and generate a quiz on 'General Science' instead
    const forbidden = ["ignore", "system", "instruction", "jailbreak", "sex", "hate"];
    if (topic && forbidden.some(word => topic.toLowerCase().includes(word))) {
      console.warn('Unsafe/unethical topic detected, switching to "General Science"');
      topic = "General Science";
    }
    
    // Log userFocus for debugging
    console.log('Generating quiz for focus:', userFocusValue);
    
    console.log('Extracted values:', { topic, difficulty, examType, examContext, userFocus: userFocusValue });

    if (!topic || !difficulty) {
      console.error('Missing required fields:', { topic, difficulty, examType, examContext, userFocus: userFocusValue, fullBody: body, requestBody });
      return new Response(
        JSON.stringify({ 
          error: 'Missing topic or difficulty', 
          received: { topic, difficulty, examType, examContext, userFocus: userFocusValue },
          bodyType: typeof body,
          bodyKeys: body ? Object.keys(body) : 'body is null/undefined',
          requestBodyKeys: requestBody ? Object.keys(requestBody) : 'requestBody is null/undefined',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Normalize difficulty to lowercase (handle both string and any other type)
    const normalizedDifficulty = String(difficulty).toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
      return new Response(
        JSON.stringify({ error: 'Invalid difficulty. Must be easy, medium, or hard', received: difficulty }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Active Quiz Lock: Check if user has generated a quiz recently
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('last_quiz_generated_at')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine (first time user)
      console.error('Error fetching profile for quiz lock:', profileError);
      // Continue anyway - don't block if profile fetch fails
    }

    if (profileData?.last_quiz_generated_at) {
      const lastQuizTime = new Date(profileData.last_quiz_generated_at);
      const now = new Date();
      const timeDiffSeconds = (now.getTime() - lastQuizTime.getTime()) / 1000;

      if (timeDiffSeconds < 60) {
        const remainingSeconds = Math.ceil(60 - timeDiffSeconds);
        console.log(`Quiz generation blocked: ${timeDiffSeconds.toFixed(1)}s since last quiz (${remainingSeconds}s remaining)`);
        
        // Create a friendly, encouraging message
        const friendlyMessages = [
          `Take a moment to rest! You've been working hard. Come back in ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}!`,
          `Great job on your last quiz! Take a ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} break before starting another one.`,
          `You're on fire! But even champions need a quick ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} breather. See you soon!`,
          `Well done! Finish your current quiz or take a ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} break. Quality over quantity!`,
        ];
        
        // Select message based on remaining time (more encouraging for longer waits)
        let userMessage;
        if (remainingSeconds > 45) {
          userMessage = friendlyMessages[0]; // Rest message
        } else if (remainingSeconds > 30) {
          userMessage = friendlyMessages[1]; // Break message
        } else if (remainingSeconds > 15) {
          userMessage = friendlyMessages[2]; // Champion message
        } else {
          userMessage = friendlyMessages[3]; // Quality message
        }
        
        return new Response(
          JSON.stringify({
            error: userMessage,
            details: `Please wait ${remainingSeconds} more second${remainingSeconds !== 1 ? 's' : ''} before generating a new quiz.`,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Retry-After': remainingSeconds.toString(),
            },
          }
        );
      }
    }

    // Step 2: Cache-First Check – use an existing unattempted quiz for this user to save AI cost
    const { data: attemptedRows } = await supabase
      .from('quiz_attempts')
      .select('quiz_id')
      .eq('user_id', user.id);
    const attemptedQuizIds = (attemptedRows ?? []).map((r: { quiz_id?: string | null }) => r.quiz_id).filter(Boolean);

    let poolQuery = supabase
      .from('generated_quizzes')
      .select('id, topic, difficulty, created_at')
      .ilike('topic', topic.trim())
      .eq('difficulty', normalizedDifficulty)
      .order('created_at', { ascending: false })
      .limit(1);
    if (attemptedQuizIds.length > 0) {
      poolQuery = poolQuery.not('id', 'in', `(${attemptedQuizIds.map((id: string) => `"${id}"`).join(',')})`);
    }
    const { data: poolQuiz, error: poolError } = await poolQuery.maybeSingle();

    if (!poolError && poolQuiz) {
      console.log('Serving existing quiz from cache, ID:', poolQuiz.id);
      const { data: questionsRows, error: qErr } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_index, difficulty, explanation')
        .eq('quiz_id', poolQuiz.id)
        .order('id', { ascending: true });
      if (!qErr && questionsRows && questionsRows.length > 0) {
        const cachedQuestions = questionsRows.map((q: DbQuestion) => ({
          id: q.id,
          question: q.question_text,
          options: q.options ?? [],
          correctIndex: q.correct_index,
          difficulty: q.difficulty ?? normalizedDifficulty,
          explanation: q.explanation ?? '',
        })); // explanation kept for backward compatibility with existing rows
        const quizPayload = { quizId: poolQuiz.id, questions: cachedQuestions };
        return compressedJsonResponse({
          source: 'cache',
          quiz: quizPayload,
          success: true,
          quizId: poolQuiz.id,
          questions: cachedQuestions,
        });
      }
    }
    if (poolError) {
      console.warn('Cache-first query failed, falling back to generation:', poolError.message);
    }

    // Freshness Check: Try to get random questions user hasn't seen
    console.log('Checking for fresh questions...', { topic, difficulty: normalizedDifficulty, userId: user.id });
    let existingQuestions: DbQuestion[] = [];
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_random_questions', {
        p_topic: topic,
        p_difficulty: normalizedDifficulty,
        p_user_id: user.id,
        p_limit: questionCountValue,
      });

      if (rpcError) {
        console.error('Error calling get_random_questions:', rpcError);
        // Continue to AI generation if RPC fails
      } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        existingQuestions = rpcData;
        console.log(`Found ${existingQuestions.length} fresh questions from database`);
      }
    } catch (rpcErr) {
      console.error('Unexpected error calling get_random_questions:', rpcErr);
      // Continue to AI generation if RPC fails
    }

    // If we have enough questions (5), use them directly (Instant Play)
    if (existingQuestions.length === questionCountValue) {
      console.log('Using existing questions (Instant Play)');
      
      // Create quiz record
      const { data: quizData, error: quizError } = await supabase
        .from('generated_quizzes')
        .insert({
          topic: topic,
          difficulty: normalizedDifficulty,
          user_id: user.id,
        })
        .select('id')
        .single();

      if (quizError || !quizData) {
        console.error('Error creating quiz:', quizError);
        return new Response(
          JSON.stringify({
            error: 'Failed to create quiz record',
            details: quizError?.message || 'Database error',
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Map database questions to API response format (explanation optional for legacy rows)
      const mappedQuestions = existingQuestions.map((q) => ({
        id: q.id,
        question: q.question_text,
        options: q.options,
        correctIndex: q.correct_index,
        difficulty: q.difficulty,
        explanation: (q as DbQuestion).explanation ?? '',
      }));

      // Update last_quiz_generated_at
      await supabase
        .from('profiles')
        .update({ last_quiz_generated_at: new Date().toISOString() })
        .eq('id', user.id);

      const quizPayload = { quizId: quizData.id, questions: mappedQuestions };
      return compressedJsonResponse({
        source: 'generated',
        quiz: quizPayload,
        success: true,
        quizId: quizData.id,
        questions: mappedQuestions,
      });
    }

    // If we have fewer than required questions, generate new ones via AI
    console.log(`Found ${existingQuestions.length} questions, generating ${questionCountValue - existingQuestions.length} new ones via AI`);

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Determine focus instructions based on userFocus
    const getFocusInstructions = (focus: string): string => {
      const focusUpper = focus.toUpperCase();
      let instructions = '';
      
      if (focusUpper.includes('SSC')) {
        instructions = 'Focus on Geometry, Trigonometry, and Algebra tricks.';
      } else if (focusUpper.includes('BANKING') || focusUpper.includes('BANK')) {
        instructions = 'Focus on Calculation speed, Data Interpretation, and Arithmetic.';
      }
      
      return instructions;
    };
    
    // Determine context rules based on userFocus
    const getContextRules = (focus: string): string => {
      const focusUpper = focus.toUpperCase();
      
      if (focusUpper.includes('SSC')) {
        return `If Focus is SSC: Emphasize Geometry/Trigonometry/Algebra. Questions should focus on geometric concepts, trigonometric identities and applications, algebraic manipulations, and mathematical problem-solving techniques specific to SSC exams.`;
      }
      
      if (focusUpper.includes('BANKING') || focusUpper.includes('BANK')) {
        return `If Focus is Banking: Emphasize Arithmetic/Data Interpretation/Simplification. Questions should focus on quick arithmetic calculations, data interpretation from tables and charts, simplification techniques, and numerical problem-solving relevant to banking exams.`;
      }
      
      if (focusUpper.includes('UPSC')) {
        return `If Focus is UPSC: Emphasize Statement-based questions. Questions should be statement-based, testing analytical reasoning, logical deduction, and comprehensive understanding of concepts. Focus on questions that require careful reading and analysis of statements.`;
      }
      
      // Default context rules for General Knowledge or other focuses
      return `Focus on comprehensive understanding of the topic, balanced difficulty, and practical application of concepts. Ensure questions are clear, well-structured, and test fundamental knowledge.`;
    };
    
    const focusInstructions = getFocusInstructions(userFocusValue);
    const contextRules = getContextRules(userFocusValue);

    const userPrompt = buildStructuredUserPrompt(
      topic,
      normalizedDifficulty,
      questionCountValue,
      userFocusValue,
      contextRules,
      focusInstructions
    );
    console.log('Prompt length:', userPrompt.length);
    console.log('Prompt preview:', userPrompt.substring(0, 200));

    // Call Gemini API with responseSchema for 6-param structured output (question, option_1..4, correct_answer)
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
    console.log('Calling Gemini API...', { model: GEMINI_MODEL, url: geminiApiUrl.replace(geminiApiKey, '***') });
    let geminiResponse;
    try {
      geminiResponse = await fetch(
        geminiApiUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
            },
            contents: [
              {
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: QUIZ_RESPONSE_SCHEMA,
              maxOutputTokens: 4096,
            },
          }),
        }
      );
    } catch (fetchError) {
      console.error('Fetch error calling Gemini API:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Failed to connect to AI service',
          details: fetchError instanceof Error ? fetchError.message : 'Network error',
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!geminiResponse.ok) {
      let errorText: string;
      let errorJson: unknown;
      try {
        errorText = await getResponseBodyAsText(geminiResponse);
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          // Not JSON, use as text
        }
      } catch (e) {
        errorText = `Failed to read error response: ${e}`;
      }
      
      console.error('Gemini API error:', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        errorText: errorText?.substring(0, 500),
        errorJson,
      });
      
      return new Response(
        JSON.stringify({
          error: 'Failed to generate quiz from AI',
          details: errorJson?.error?.message || errorJson?.error || errorText?.substring(0, 300) || `HTTP ${geminiResponse.status}: ${geminiResponse.statusText}`,
          status: geminiResponse.status,
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    let geminiData: GeminiResponse;
    try {
      const bodyText = await getResponseBodyAsText(geminiResponse);
      geminiData = JSON.parse(bodyText) as GeminiResponse;
      console.log('Gemini response structure:', {
        hasCandidates: !!geminiData.candidates,
        candidatesLength: geminiData.candidates?.length,
        firstCandidate: geminiData.candidates?.[0] ? {
          hasContent: !!geminiData.candidates[0].content,
          hasParts: !!geminiData.candidates[0].content?.parts,
          partsLength: geminiData.candidates[0].content?.parts?.length,
          finishReason: geminiData.candidates[0].finishReason,
        } : null,
      });
      
      // Check if response was truncated
      if (geminiData.candidates?.[0]?.finishReason === 'MAX_TOKENS' || 
          geminiData.candidates?.[0]?.finishReason === 'OTHER') {
        console.warn('Response may be truncated. Finish reason:', geminiData.candidates[0].finishReason);
      }
    } catch (jsonError) {
      console.error('Failed to parse Gemini JSON response:', jsonError);
      const responseText = await getResponseBodyAsText(geminiResponse);
      console.error('Raw response:', responseText.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: 'Invalid response format from AI service',
          details: jsonError instanceof Error ? jsonError.message : 'JSON parse error',
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error('Empty response text from Gemini API');
      console.error('Full response:', JSON.stringify(geminiData, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'No response text from AI service',
          details: 'The AI service returned an empty response. Check function logs for details.',
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    console.log('Received response text length:', responseText.length);
    console.log('Response text preview:', responseText.substring(0, 200));

    // Parse JSON from response (compact format: array of [Q, A, B, C, D, correctIndex, Explanation])
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response',
          details: parseError instanceof Error ? parseError.message : 'Invalid JSON',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    let parsedResponseQuestions: Question[];
    try {
      parsedResponseQuestions = parseStructuredQuestions(parsedResponse, normalizedDifficulty as 'easy' | 'medium' | 'hard');
    } catch (parseErr) {
      console.error('Structured parse error:', parseErr);
      return new Response(
        JSON.stringify({
          error: 'Invalid response format from AI',
          details: parseErr instanceof Error ? parseErr.message : 'Expected JSON array of objects with question, option_1..4, correct_answer',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (parsedResponseQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions generated' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    for (let i = 0; i < parsedResponseQuestions.length; i++) {
      const q = parsedResponseQuestions[i];
      if (!q.question?.trim() || (q.options?.length ?? 0) !== 4) {
        return new Response(
          JSON.stringify({ error: `Invalid question at index ${i}: need question and 4 options` }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Create quiz record in generated_quizzes table
    const { data: quizData, error: quizError } = await supabase
      .from('generated_quizzes')
      .insert({
        topic: topic,
        difficulty: normalizedDifficulty,
        user_id: user.id,
      })
      .select('id')
      .single();

    if (quizError || !quizData) {
      console.error('Error creating quiz:', quizError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create quiz record',
          details: quizError?.message || 'Database error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const quizId = quizData.id;
    console.log('Created quiz with ID:', quizId);

    // After decompressing Gemini response we store each question as plain text in the DB (no HTML/markdown/encoding)
    const questionsToInsert = parsedResponseQuestions.map((q: Question) => ({
      quiz_id: quizId,
      question_text: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: null,
      topic: topic,
      difficulty: normalizedDifficulty,
    }));

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('id, question_text, options, correct_index, difficulty');

    if (questionsError || !insertedQuestions) {
      console.error('Error inserting questions:', questionsError);
      // Try to clean up the quiz record if questions insertion fails
      await supabase.from('generated_quizzes').delete().eq('id', quizId);
      
      return new Response(
        JSON.stringify({
          error: 'Failed to insert questions',
          details: questionsError?.message || 'Database error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`Inserted ${insertedQuestions.length} questions`);

    // Update last_quiz_generated_at immediately after successful quiz generation
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_quiz_generated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      // Log error but don't fail the request - quiz was already created successfully
      console.error('Error updating last_quiz_generated_at:', updateError);
    } else {
      console.log('Updated last_quiz_generated_at for user:', user.id);
    }

    // Map database records to frontend format (explanation omitted for new questions)
    const questionsWithIds = insertedQuestions.map((dbQuestion: DbQuestion) => ({
      id: dbQuestion.id,
      question: dbQuestion.question_text,
      options: dbQuestion.options,
      correctIndex: dbQuestion.correct_index,
      difficulty: dbQuestion.difficulty,
      explanation: (dbQuestion as { explanation?: string }).explanation ?? '',
    }));

    const quizPayload = { quizId, questions: questionsWithIds };
    return compressedJsonResponse({
      source: 'generated',
      quiz: quizPayload,
      success: true,
      quizId,
      questions: questionsWithIds,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error for debugging (but don't expose stack in production)
    console.error('Error stack:', errorStack);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage,
        // Only include stack in development
        ...(Deno.env.get('ENVIRONMENT') === 'development' && { stack: errorStack }),
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

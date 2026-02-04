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
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examType?: string | null;
  examContext?: string | null;
  userFocus?: string | null;
  questionCount?: number;
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
}

interface DbQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
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

const SYSTEM_PROMPT_TEMPLATE = (userFocus: string, topic: string, difficulty: string, contextRules: string, focusInstructions: string, questionCount: number = 5) => `You are an expert exam setter for ${userFocus}. Generate exactly ${questionCount} multiple-choice questions on ${topic}. Difficulty: ${difficulty}.
${focusInstructions ? `\n${focusInstructions}\n` : ''}
Context Rules:

${contextRules}

Technical Requirements:
- Each question must have exactly 4 options
- Return ONLY valid JSON, no markdown, no code blocks
- Use plain text for math expressions (e.g., "2x + 3y = 12" instead of LaTeX "$2x + 3y = 12$")
- Avoid special characters that require escaping in JSON strings
- All text must be properly escaped for JSON (use \\n for newlines, \\" for quotes)
- Strictly follow the question pattern, difficulty, and syllabus of ${userFocus}

JSON Format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "easy|medium|hard",
      "explanation": "A short, clear reason why the correct answer is right, written in Hinglish (mix of Hindi and English). Example: 'Yeh answer sahi hai kyunki Article 14 equality guarantee karta hai.'"
    }
  ]
}

Important:
- correctIndex must be 0, 1, 2, or 3 (matching the options array index)
- All questions must match the requested difficulty level
- explanation is REQUIRED for every question and MUST be written in Hinglish (mix of Hindi and English words)
- Hinglish means: Use Hindi words naturally mixed with English, like "Yeh concept important hai", "Iska reason yeh hai ki", "Article 14 equality provide karta hai"
- Explanations should be concise (1-2 sentences), clear, and help users understand why the correct answer is right
- Return ONLY the JSON object, nothing else
- Use plain text math notation, avoid LaTeX syntax with dollar signs`;

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

      // Map database questions to API response format
      const mappedQuestions = existingQuestions.map((q) => ({
        id: q.id,
        question: q.question_text,
        options: q.options,
        correctIndex: q.correct_index,
        difficulty: q.difficulty,
        explanation: q.explanation || '',
      }));

      // Update last_quiz_generated_at
      await supabase
        .from('profiles')
        .update({ last_quiz_generated_at: new Date().toISOString() })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          quizId: quizData.id,
          questions: mappedQuestions,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
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
    
    // Build the prompt dynamically using the template function
    const prompt = SYSTEM_PROMPT_TEMPLATE(userFocusValue, topic, normalizedDifficulty, contextRules, focusInstructions, questionCountValue);
    
    console.log('Prompt length:', prompt.length);
    console.log('Prompt preview:', prompt.substring(0, 200));

    // Call Gemini API
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
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            // Force JSON output from Flash model
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 4096, // Ensure enough tokens for complete JSON response
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
      let errorText;
      let errorJson;
      try {
        errorText = await geminiResponse.text();
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
      geminiData = await geminiResponse.json();
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
      const responseText = await geminiResponse.text();
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

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Clean JSON string: escape bad control characters
    const cleanJsonString = (jsonStr: string): string => {
      let cleaned = jsonStr;
      let result = '';
      let i = 0;
      
      // Process character by character to avoid breaking escape sequences
      while (i < cleaned.length) {
        const char = cleaned[i];
        const code = char.charCodeAt(0);
        
        // If it's a backslash, check if it's part of an escape sequence
        if (char === '\\' && i + 1 < cleaned.length) {
          const nextChar = cleaned[i + 1];
          // Valid escape sequences: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
          if ('"\\/bfnrtu'.includes(nextChar)) {
            // Keep the escape sequence as-is
            result += char + nextChar;
            i += 2;
            continue;
          }
        }
        
        // Handle control characters (0x00-0x1F)
        if (code >= 0x00 && code <= 0x1F) {
          switch (code) {
            case 0x08: result += '\\b'; break; // backspace
            case 0x09: result += '\\t'; break; // tab
            case 0x0A: result += '\\n'; break; // newline
            case 0x0C: result += '\\f'; break; // form feed
            case 0x0D: result += '\\r'; break; // carriage return
            default:
              // For other control chars, replace with space
              result += ' ';
          }
        } else {
          result += char;
        }
        i++;
      }
      
      return result;
    };

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text length:', jsonText.length);
      
      // Extract error position if available
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      const positionMatch = errorMessage.match(/position (\d+)/);
      const errorPosition = positionMatch ? parseInt(positionMatch[1], 10) : null;
      
      if (errorPosition !== null) {
        const start = Math.max(0, errorPosition - 100);
        const end = Math.min(jsonText.length, errorPosition + 100);
        console.error(`Error around position ${errorPosition}:`, jsonText.substring(start, end));
        console.error('Character at error position:', jsonText[errorPosition]);
        console.error('Character code:', jsonText.charCodeAt(errorPosition));
      } else {
        console.error('Response text (first 1000 chars):', jsonText.substring(0, 1000));
        console.error('Response text (last 200 chars):', jsonText.substring(Math.max(0, jsonText.length - 200)));
      }
      
      // Try to fix incomplete JSON (Unexpected end of JSON input)
      if (errorMessage.includes('Unexpected end of JSON input') || errorMessage.includes('end of JSON')) {
        try {
          console.log('Attempting to fix incomplete JSON...');
          let fixedJson = jsonText.trim();
          
          // Count braces and brackets to see what's missing
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          const openBrackets = (fixedJson.match(/\[/g) || []).length;
          const closeBrackets = (fixedJson.match(/\]/g) || []).length;
          
          // Remove trailing commas before closing structures
          fixedJson = fixedJson.replace(/,\s*$/, '');
          
          // Check if we're in the middle of a string (simplified check)
          // Look for unclosed strings by checking if last quote is escaped
          let quoteCount = 0;
          let escaped = false;
          for (let i = 0; i < fixedJson.length; i++) {
            if (fixedJson[i] === '\\' && !escaped) {
              escaped = true;
              continue;
            }
            if (fixedJson[i] === '"' && !escaped) {
              quoteCount++;
            }
            escaped = false;
          }
          
          // If odd number of quotes, close the string
          if (quoteCount % 2 !== 0) {
            fixedJson += '"';
            console.log('Closed unclosed string');
          }
          
          // Close arrays (most nested first)
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            fixedJson += ']';
          }
          
          // Close objects (most nested first)
          for (let i = 0; i < openBraces - closeBraces; i++) {
            fixedJson += '}';
          }
          
          console.log(`Fixed JSON: added ${openBrackets - closeBrackets} closing brackets, ${openBraces - closeBraces} closing braces`);
          parsedResponse = JSON.parse(fixedJson);
          console.log('Successfully fixed incomplete JSON');
        } catch (fixError) {
          console.error('Failed to fix incomplete JSON:', fixError);
          // Log the original JSON for debugging
          console.error('Original JSON preview (last 200 chars):', jsonText.substring(Math.max(0, jsonText.length - 200)));
        }
      }
      
      // Try to fix control character issues
      if (!parsedResponse && (errorMessage.includes('Bad control character') || errorMessage.includes('control character'))) {
        try {
          console.log('Attempting to clean JSON string of control characters...');
          const cleanedJsonText = cleanJsonString(jsonText);
          parsedResponse = JSON.parse(cleanedJsonText);
          console.log('Successfully fixed JSON control character issues');
        } catch (fixError) {
          console.error('Failed to fix JSON control characters:', fixError);
        }
      }
      
      // Try to fix common escape issues
      if (!parsedResponse && errorMessage.includes('Bad escaped character')) {
        // Try fixing unescaped backslashes before certain characters
        let fixedJson = jsonText;
        try {
          // Replace unescaped backslashes before non-escape characters
          fixedJson = jsonText.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
          parsedResponse = JSON.parse(fixedJson);
          console.log('Successfully fixed JSON escape issues');
        } catch (fixError) {
          console.error('Failed to fix JSON escapes:', fixError);
        }
      }
      
      // If still not parsed, return error
      if (!parsedResponse) {
        // Check if JSON appears incomplete
        const openBraces = (jsonText.match(/\{/g) || []).length;
        const closeBraces = (jsonText.match(/\}/g) || []).length;
        const openBrackets = (jsonText.match(/\[/g) || []).length;
        const closeBrackets = (jsonText.match(/\]/g) || []).length;
        
        const isIncomplete = openBraces !== closeBraces || openBrackets !== closeBrackets;
        const isEndOfInputError = errorMessage.includes('Unexpected end of JSON input') || errorMessage.includes('end of JSON');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to parse AI response',
            details: isEndOfInputError || isIncomplete
              ? 'Response appears to be truncated or incomplete JSON. The AI may have hit token limits. Try reducing the number of questions or simplifying the topic.'
              : errorMessage.includes('Bad escaped character')
              ? 'JSON contains invalid escape sequences. This may be due to LaTeX math expressions in the content.'
              : errorMessage.includes('Bad control character')
              ? 'JSON contains invalid control characters. This may be due to special characters in the content.'
              : 'Invalid JSON format received',
            parseError: errorMessage,
            jsonLength: jsonText.length,
            errorPosition: errorPosition,
            braceMismatch: openBraces !== closeBraces,
            bracketMismatch: openBrackets !== closeBrackets,
            isIncomplete: isIncomplete || isEndOfInputError,
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
    }

    // Validate response structure
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      console.error('Invalid response structure:', parsedResponse);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format from AI',
          details: 'Expected questions array',
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

    // Validate questions array has items
    if (parsedResponse.questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions generated' }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Validate each question has required fields
    for (let i = 0; i < parsedResponse.questions.length; i++) {
      const q = parsedResponse.questions[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        console.error(`Invalid question at index ${i}:`, q);
        return new Response(
          JSON.stringify({ 
            error: `Invalid question format at index ${i}`,
            details: 'Each question must have question text and exactly 4 options',
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
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
        console.error(`Invalid correctIndex at question ${i}:`, q.correctIndex);
        return new Response(
          JSON.stringify({ 
            error: `Invalid correctIndex at question ${i}`,
            details: 'correctIndex must be 0, 1, 2, or 3',
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
      if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim() === '') {
        console.error(`Missing or invalid explanation at question ${i}:`, q);
        return new Response(
          JSON.stringify({ 
            error: `Missing explanation at question ${i}`,
            details: 'Each question must have a non-empty explanation field',
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

    // Insert questions into questions table
    const questionsToInsert = parsedResponse.questions.map((q: Question) => ({
      quiz_id: quizId,
      question_text: q.question,
      options: q.options, // JSONB array
      correct_index: q.correctIndex,
      explanation: q.explanation,
      topic: topic,
      difficulty: normalizedDifficulty,
    }));

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('id, question_text, options, correct_index, explanation, difficulty');

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

    // Map database records to frontend format
    const questionsWithIds = insertedQuestions.map((dbQuestion: DbQuestion) => ({
      id: dbQuestion.id,
      question: dbQuestion.question_text,
      options: dbQuestion.options,
      correctIndex: dbQuestion.correct_index,
      difficulty: dbQuestion.difficulty,
      explanation: dbQuestion.explanation,
    }));

    // Return the questions with their DB IDs
    return new Response(
      JSON.stringify({
        success: true,
        quizId: quizId,
        questions: questionsWithIds,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

interface RequestBody {
  topic: string;
  difficulty: string;
  userId?: string; // ignored; we use JWT
}

interface StructuredQuestion {
  question: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_answer: number;
}

interface Question {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: string;
  explanation?: string;
}

const QUIZ_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      option_1: { type: 'string' },
      option_2: { type: 'string' },
      option_3: { type: 'string' },
      option_4: { type: 'string' },
      correct_answer: { type: 'integer', description: '0-3' },
    },
    required: ['question', 'option_1', 'option_2', 'option_3', 'option_4', 'correct_answer'],
  },
};

const GEMINI_SYSTEM = `You are a Quiz Generator. Output a JSON array of question objects. Each object has exactly 6 fields: question, option_1, option_2, option_3, option_4, correct_answer.
correct_answer is an integer 0-3. Use plain text for math. No explanations.`;

function parseStructured(raw: unknown, difficulty: string): Question[] {
  if (!Array.isArray(raw)) throw new Error('Expected array');
  const out: Question[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as StructuredQuestion;
    if (!row || typeof row !== 'object') throw new Error(`Invalid question at ${i}`);
    const options = [
      String(row.option_1 ?? ''),
      String(row.option_2 ?? ''),
      String(row.option_3 ?? ''),
      String(row.option_4 ?? ''),
    ];
    const idx = Number(row.correct_answer);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new Error(`Invalid correct_answer at ${i}`);
    out.push({
      question: String(row.question ?? ''),
      options,
      correctIndex: idx,
      difficulty,
      explanation: '',
    });
  }
  return out;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: CORS,
    });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: CORS,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: CORS,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: CORS,
    });
  }

  let body: RequestBody;
  try {
    const text = await req.text();
    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: CORS,
      });
    }
    body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: CORS,
    });
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const difficulty = (typeof body.difficulty === 'string' ? body.difficulty : 'medium').toLowerCase();
  if (!topic) {
    return new Response(JSON.stringify({ error: 'topic is required' }), {
      status: 400,
      headers: CORS,
    });
  }
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return new Response(JSON.stringify({ error: 'difficulty must be easy, medium, or hard' }), {
      status: 400,
      headers: CORS,
    });
  }

  const questionCount = 10;
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: CORS,
    });
  }

  const userPrompt = `Generate exactly ${questionCount} ${difficulty} multiple-choice questions on ${topic}. Output a JSON array of objects. Each object must have: question (string), option_1, option_2, option_3, option_4 (strings), correct_answer (integer 0-3). No explanations.`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GEMINI_SYSTEM }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: QUIZ_RESPONSE_SCHEMA,
          maxOutputTokens: 4096,
        },
      }),
    });
  } catch (e) {
    console.error('Gemini fetch error:', e);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to AI service', details: String(e) }),
      { status: 500, headers: CORS }
    );
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error('Gemini error:', geminiRes.status, errText);
    return new Response(
      JSON.stringify({ error: 'AI service error', details: errText.slice(0, 300) }),
      { status: 500, headers: CORS }
    );
  }

  const geminiJson = await geminiRes.json();
  const text =
    geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return new Response(JSON.stringify({ error: 'No response from AI' }), {
      status: 500,
      headers: CORS,
    });
  }

  let jsonText = text.trim();
  if (jsonText.startsWith('```')) jsonText = jsonText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid AI response JSON', details: String(e) }), {
      status: 500,
      headers: CORS,
    });
  }

  let questions: Question[];
  try {
    questions = parseStructured(parsed, difficulty);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid question format', details: String(e) }), {
      status: 500,
      headers: CORS,
    });
  }

  if (questions.length === 0) {
    return new Response(JSON.stringify({ error: 'No questions generated' }), {
      status: 500,
      headers: CORS,
    });
  }

  // Add ids for client
  const questionsWithIds = questions.map((q, i) => ({
    ...q,
    id: `q-${i + 1}`,
  }));

  const questionData = { questions: questionsWithIds };
  const slug = `ai-${user.id.slice(0, 8)}-${topic.slice(0, 20).replace(/\s+/g, '-')}-${Date.now()}`;
  const title = `AI Test: ${topic}`;

  const { data: row, error: insertErr } = await supabase
    .from('mock_tests')
    .insert({
      title,
      slug,
      exam_type: 'AI_TOPIC',
      status: 'READY',
      user_id: user.id,
      topic,
      question_data: questionData,
      is_completed: false, // engagement gate: user must complete before generating a new test for this topic
    })
    .select('id')
    .single();

  if (insertErr || !row) {
    console.error('mock_tests insert error:', insertErr);
    return new Response(
      JSON.stringify({ error: 'Failed to save test', details: insertErr?.message }),
      { status: 500, headers: CORS }
    );
  }

  return new Response(
    JSON.stringify({
      id: row.id,
      success: true,
      questions: questionsWithIds,
    }),
    { status: 200, headers: CORS }
  );
});

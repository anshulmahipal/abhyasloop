import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash-latest';

interface RequestBody {
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string | null;
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

interface ExplanationResponse {
  explanation: string;
  trap_analysis?: string;
  mnemonic: string;
}

const createPrompt = (question: string, options: string[], correctAnswer: string, userAnswer?: string | null): string => {
  const optionsList = options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n');
  const userAnswerText = userAnswer && userAnswer !== correctAnswer 
    ? `\n\nUser's Answer: ${userAnswer}` 
    : '';

  return `You are a friendly, expert tutor for Indian Competitive Exams.

Task: Explain why the correct answer is right and why the user's answer (if different) is a common trap.

Question: ${question}

Options:
${optionsList}

Correct Answer: ${correctAnswer}${userAnswerText}

Instructions:
1. Explain why the correct answer is right in a clear, concise way (2-3 sentences).
2. If the user selected a different answer, explain why that answer is a common mistake/trap in a separate field (1-2 sentences).
3. Include a short Mnemonic or "Memory Hack" to help remember this concept forever.

Output Format (JSON only, no markdown):
{
  "explanation": "Clear explanation here...",
  "trap_analysis": "Why the user's wrong answer is a common trap (only if user answered incorrectly)...",
  "mnemonic": "Memory hack here..."
}

Important:
- Return ONLY valid JSON, no markdown, no code blocks
- Use plain text for all content
- Keep explanations concise but helpful
- Make mnemonics memorable and fun
- Write in Hinglish (mix of Hindi and English) for better understanding`;
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { question, options, correctAnswer, userAnswer } = body;

    // Input validation
    if (!question || !options || !correctAnswer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: question, options, correctAnswer' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!Array.isArray(options) || options.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Options must be a non-empty array' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!options.includes(correctAnswer)) {
      return new Response(
        JSON.stringify({ error: 'Correct answer must be one of the provided options' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get Gemini API key
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

    // Create prompt
    const prompt = createPrompt(question, options, correctAnswer, userAnswer);

    // Call Gemini API
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
    console.log('Calling Gemini API for explanation...', { model: GEMINI_MODEL });

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
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 1024,
              temperature: 0.7,
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
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        error: errorText,
      });
      return new Response(
        JSON.stringify({
          error: 'AI service error',
          details: errorText.substring(0, 300),
        }),
        {
          status: geminiResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse Gemini response
    let geminiData: GeminiResponse;
    try {
      geminiData = await geminiResponse.json();
    } catch (jsonError) {
      console.error('Failed to parse Gemini JSON response:', jsonError);
      const responseText = await geminiResponse.text();
      console.error('Raw response:', responseText.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: 'Invalid response from AI service',
          details: 'Failed to parse JSON response',
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
      return new Response(
        JSON.stringify({
          error: 'Empty response from AI service',
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

    // Parse the JSON response
    let explanationData: ExplanationResponse;
    try {
      // Clean the response text (remove markdown code blocks if present)
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      explanationData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse explanation JSON:', parseError);
      console.error('Response text:', responseText);
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response',
          details: parseError instanceof Error ? parseError.message : 'Invalid JSON',
          rawResponse: responseText.substring(0, 200),
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

    // Validate response structure
    if (!explanationData.explanation || !explanationData.mnemonic) {
      return new Response(
        JSON.stringify({
          error: 'Invalid response format from AI service',
          details: 'Missing explanation or mnemonic',
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

    // trap_analysis is optional (only needed if user answered incorrectly)

    // Return success response
    return new Response(
      JSON.stringify(explanationData),
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
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
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

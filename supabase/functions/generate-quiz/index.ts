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
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
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

const SYSTEM_PROMPT = `You are a quiz generator for government exam preparation. Generate exactly 5 multiple-choice questions in JSON format.

Requirements:
- Topic: {TOPIC}
- Difficulty: {DIFFICULTY}
- Each question must have exactly 4 options
- Return ONLY valid JSON, no markdown, no code blocks
- Use plain text for math expressions (e.g., "2x + 3y = 12" instead of LaTeX "$2x + 3y = 12$")
- Avoid special characters that require escaping in JSON strings
- All text must be properly escaped for JSON (use \\n for newlines, \\" for quotes)

JSON Format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "easy|medium|hard",
      "explanation": "Detailed explanation of why the correct answer is correct"
    }
  ]
}

Important:
- correctIndex must be 0, 1, 2, or 3 (matching the options array index)
- All questions must match the requested difficulty level
- Explanations should be educational and help users learn
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
    // Log request details for debugging
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
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

    const { topic, difficulty } = requestBody;
    console.log('Extracted values:', { topic, difficulty });

    if (!topic || !difficulty) {
      console.error('Missing required fields:', { topic, difficulty, fullBody: body, requestBody });
      return new Response(
        JSON.stringify({ 
          error: 'Missing topic or difficulty', 
          received: { topic, difficulty },
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

    // Build the prompt with topic and difficulty
    const prompt = SYSTEM_PROMPT
      .replace('{TOPIC}', topic)
      .replace('{DIFFICULTY}', normalizedDifficulty);
    
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
      } else {
        console.error('Response text (first 1000 chars):', jsonText.substring(0, 1000));
        console.error('Response text (last 200 chars):', jsonText.substring(Math.max(0, jsonText.length - 200)));
      }
      
      // Try to fix common escape issues
      if (errorMessage.includes('Bad escaped character')) {
        // Try fixing unescaped backslashes before certain characters
        // This is a heuristic - escape backslashes that aren't part of valid escape sequences
        let fixedJson = jsonText;
        try {
          // Replace unescaped backslashes before non-escape characters
          // But be careful not to break valid escapes like \n, \t, etc.
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
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to parse AI response',
            details: isIncomplete 
              ? 'Response appears to be truncated or incomplete JSON. The AI may have hit token limits.'
              : errorMessage.includes('Bad escaped character')
              ? 'JSON contains invalid escape sequences. This may be due to LaTeX math expressions in the content.'
              : 'Invalid JSON format received',
            parseError: errorMessage,
            jsonLength: jsonText.length,
            errorPosition: errorPosition,
            braceMismatch: openBraces !== closeBraces,
            bracketMismatch: openBrackets !== closeBrackets,
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
    }

    // Return the questions
    return new Response(
      JSON.stringify({
        success: true,
        questions: parsedResponse.questions,
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

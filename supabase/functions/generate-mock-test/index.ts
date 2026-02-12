import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface RequestBody {
  examType: string; // e.g., "UPSC_PRELIMS_MINI"
  title?: string; // Optional custom title
}

interface BlueprintSection {
  subject: string;
  topic: string;
  count: number;
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
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

/**
 * Worker Function: Generate questions for a single section
 */
async function generateSectionQuestions(
  subject: string,
  topic: string,
  count: number,
  examType: string
): Promise<Question[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const systemPrompt = `You are an expert exam setter. Generate exactly ${count} multiple-choice questions on ${subject} - ${topic} for ${examType} exam.

Technical Requirements:
- Each question must have exactly 4 options
- Return ONLY valid JSON, no markdown, no code blocks
- Use plain text for math expressions
- All text must be properly escaped for JSON

JSON Format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Clear explanation in Hinglish (mix of Hindi and English)"
    }
  ]
}

Important:
- correctIndex must be 0, 1, 2, or 3
- explanation is REQUIRED and MUST be in Hinglish
- Return ONLY the JSON object, nothing else`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates[0]?.content?.parts[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini API');
  }

  // Parse JSON response (handle markdown code blocks if present)
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```json\n?/, '').replace(/```$/, '');
  }

  const parsed = JSON.parse(jsonText);
  return parsed.questions || [];
}

/**
 * Orchestrator: Create mock test and generate all sections
 */
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: RequestBody = await req.json();
    const { examType, title } = body;

    if (!examType) {
      return new Response(JSON.stringify({ error: 'examType is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Import blueprint (inline for Edge Function)
    // In production, you'd fetch this from a config file or database
    const EXAM_BLUEPRINTS: Record<string, { title: string; sections: BlueprintSection[] }> = {
      UPSC_PRELIMS_MINI: {
        title: 'UPSC Prelims Mini Mock',
        sections: [
          { subject: 'History', topic: 'Indian Freedom Struggle', count: 5 },
          { subject: 'English', topic: 'Reading Comprehension', count: 5 },
        ],
      },
      SSC_CGL_MINI: {
        title: 'SSC CGL Mini Mock',
        sections: [
          { subject: 'Quant', topic: 'Arithmetic', count: 5 },
          { subject: 'Reasoning', topic: 'General Intelligence', count: 5 },
        ],
      },
    };

    const blueprint = EXAM_BLUEPRINTS[examType];
    if (!blueprint) {
      return new Response(
        JSON.stringify({ error: `Unknown exam type: ${examType}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate unique slug
    const slug = `${examType.toLowerCase()}-${Date.now()}`;

    // Step 1: Create MockTest record
    const { data: mockTest, error: mockTestError } = await supabase
      .from('mock_tests')
      .insert({
        title: title || blueprint.title,
        slug,
        exam_type: examType,
        status: 'BUILDING',
      })
      .select()
      .single();

    if (mockTestError || !mockTest) {
      console.error('Error creating mock test:', mockTestError);
      return new Response(
        JSON.stringify({ error: 'Failed to create mock test', details: mockTestError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Create TestSection records
    const sectionsToCreate = blueprint.sections.map((section, index) => ({
      mock_test_id: mockTest.id,
      subject_name: section.subject,
      topic_name: section.topic,
      question_count: section.count,
      status: 'PENDING',
      order_index: index,
    }));

    const { data: testSections, error: sectionsError } = await supabase
      .from('test_sections')
      .insert(sectionsToCreate)
      .select();

    if (sectionsError || !testSections) {
      console.error('Error creating test sections:', sectionsError);
      // Update mock test status to FAILED
      await supabase
        .from('mock_tests')
        .update({ status: 'FAILED', error_message: sectionsError?.message })
        .eq('id', mockTest.id);

      return new Response(
        JSON.stringify({ error: 'Failed to create test sections', details: sectionsError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 3: Generate questions for each section (async, don't wait)
    // This allows the function to return immediately while generation continues
    Promise.all(
      testSections.map(async (section) => {
        try {
          // Update section status to GENERATING
          await supabase
            .from('test_sections')
            .update({ status: 'GENERATING' })
            .eq('id', section.id);

          // Generate questions
          const questions = await generateSectionQuestions(
            section.subject_name,
            section.topic_name,
            section.question_count,
            examType
          );

          // Insert questions into database
          const questionsToInsert = questions.map((q, index) => ({
            section_id: section.id,
            question_text: q.question,
            options: q.options,
            correct_answer: q.correctIndex,
            explanation: q.explanation,
            order_index: index,
          }));

          const { error: questionsError } = await supabase
            .from('mock_test_questions')
            .insert(questionsToInsert);

          if (questionsError) {
            throw questionsError;
          }

          // Update section status to COMPLETED
          await supabase
            .from('test_sections')
            .update({ status: 'COMPLETED' })
            .eq('id', section.id);
        } catch (error) {
          console.error(`Error generating section ${section.id}:`, error);
          // Update section status to FAILED
          await supabase
            .from('test_sections')
            .update({
              status: 'FAILED',
            })
            .eq('id', section.id);
        }
      })
    ).catch((error) => {
      console.error('Error in parallel generation:', error);
    });

    // Return immediately with mock test info
    return new Response(
      JSON.stringify({
        success: true,
        mockTest: {
          id: mockTest.id,
          title: mockTest.title,
          slug: mockTest.slug,
          examType: mockTest.exam_type,
          status: mockTest.status,
        },
        message: 'Mock test generation started. Check status via API.',
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
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

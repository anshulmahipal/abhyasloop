import { supabase } from '../lib/supabase';
import {
  trackAIGenerationSuccess,
  trackAIGenerationError,
} from './analytics';

export type GetOrGenerateResult =
  | { status: 'pending'; testId: string; message: string; questionData?: { questions: unknown[] } }
  | { status: 'new'; testId: string; data: { questions: unknown[] } };

/**
 * Engagement-gated flow: user cannot generate a new AI test for a topic
 * if they have an unattempted one. Returns either pending (resume) or new (start).
 */
export async function getOrGenerateTest(
  userId: string,
  topic: string,
  difficulty: string
): Promise<GetOrGenerateResult> {
  // Step A: Check for unattempted test for this user + topic
  const { data: existing, error: checkError } = await supabase
    .from('mock_tests')
    .select('id, question_data')
    .eq('user_id', userId)
    .eq('topic', topic.trim())
    .eq('is_completed', false)
    .limit(1)
    .maybeSingle();

  if (checkError) {
    console.error('examService: check for pending test failed', checkError);
    throw new Error('Failed to check existing tests. Please try again.');
  }

  // Step B: Block — return pending so UI can show "Resume Test"
  if (existing) {
    const questionData =
      existing.question_data && typeof existing.question_data === 'object' && 'questions' in existing.question_data
        ? (existing.question_data as { questions: unknown[] })
        : undefined;
    return {
      status: 'pending',
      testId: existing.id,
      message: `You have an incomplete AI-generated test for ${topic}. You must complete it before generating a new one.`,
      questionData,
    };
  }

  // Step C: No unattempted test — invoke generate-exam Edge Function
  const startTime = performance.now();
  const topicTrimmed = topic.trim();
  try {
    const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
      'generate-exam',
      {
        body: { userId, topic: topicTrimmed, difficulty: difficulty.toLowerCase() },
      }
    );

    if (invokeError) {
      console.error('examService: generate-exam failed', invokeError);
      throw new Error(invokeError.message || 'Failed to generate test. Please try again.');
    }

    if (!invokeData || typeof invokeData !== 'object') {
      throw new Error('No data returned from test generation.');
    }

    const err = (invokeData as { error?: string; details?: string }).error;
    if (err) {
      const details = (invokeData as { details?: string }).details;
      throw new Error(details || err);
    }

    const id = (invokeData as { id?: string }).id;
    const questions = (invokeData as { questions?: unknown[] }).questions;
    if (!id || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid response from test generation.');
    }

    const durationMs = Math.round(performance.now() - startTime);
    trackAIGenerationSuccess(topicTrimmed, durationMs);
    return { status: 'new', testId: id, data: { questions } };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    trackAIGenerationError(
      topicTrimmed,
      error instanceof Error ? error.message : String(error),
      durationMs
    );
    throw error;
  }
}

/**
 * Check for an incomplete (not completed) mock test for this user + topic.
 * Used for full mock test: show existing test first instead of generating a new one.
 */
export async function getPendingMockTest(
  userId: string,
  topic: string
): Promise<{ testId: string } | null> {
  const { data, error } = await supabase
    .from('mock_tests')
    .select('id')
    .eq('user_id', userId)
    .eq('topic', topic.trim())
    .eq('is_completed', false)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('examService: getPendingMockTest failed', error);
    return null;
  }
  return data ? { testId: data.id } : null;
}

/**
 * Load a stored test by id (for resume). Returns question_data or null.
 */
export async function getTestById(testId: string): Promise<{ questions: unknown[] } | null> {
  const { data, error } = await supabase
    .from('mock_tests')
    .select('question_data')
    .eq('id', testId)
    .maybeSingle();

  if (error) {
    console.error('examService: getTestById failed', error);
    throw new Error('Failed to load test.');
  }

  if (!data?.question_data || typeof data.question_data !== 'object') return null;
  const payload = data.question_data as { questions?: unknown[] };
  if (!Array.isArray(payload.questions)) return null;
  return { questions: payload.questions };
}

/**
 * Mark a mock_tests row as completed after the user finishes the exam.
 * Allows the user to generate a new AI test for the same topic (engagement gate).
 */
export async function markTestCompleted(testId: string): Promise<void> {
  const { error } = await supabase
    .from('mock_tests')
    .update({ is_completed: true })
    .eq('id', testId);

  if (error) {
    console.error('examService: markTestCompleted failed', error);
    throw new Error('Failed to mark test as completed.');
  }
}

/**
 * Completion mutation: set is_completed = true for the given test.
 * Alias for markTestCompleted.
 */
export async function markTestAsCompleted(testId: string): Promise<void> {
  return markTestCompleted(testId);
}

export interface SaveMergedMockTestParams {
  userId: string;
  topic: string;
  questions: unknown[];
  title?: string;
}

/**
 * Insert a single mock_tests row with merged question_data (e.g. from multi-section generator).
 * Used after client-side serial generation; one transaction, one row.
 */
export async function saveMergedMockTest({
  userId,
  topic,
  questions,
  title = 'Full Mock Test',
}: SaveMergedMockTestParams): Promise<string> {
  const slug = `full-mock-${userId.slice(0, 8)}-${Date.now()}`;
  const questionData = { questions };

  const { data, error } = await supabase
    .from('mock_tests')
    .insert({
      title,
      slug,
      exam_type: 'AI_TOPIC',
      status: 'READY',
      user_id: userId,
      topic,
      question_data: questionData,
      is_completed: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('examService: saveMergedMockTest failed', error);
    throw new Error('Failed to save mock test. Please try again.');
  }

  if (!data?.id) throw new Error('No id returned from mock_tests insert.');
  return data.id;
}

/**
 * Invoke generate-exam for a single topic (e.g. one section of a full mock test).
 * Returns questions and the mock_tests row id. Caller may merge and then delete these ids.
 */
export async function invokeGenerateExam(
  topic: string,
  difficulty: string
): Promise<{ id: string; questions: unknown[] }> {
  const startTime = performance.now();
  const topicTrimmed = topic.trim();
  try {
    const { data, error } = await supabase.functions.invoke('generate-exam', {
      body: { topic: topicTrimmed, difficulty: difficulty.toLowerCase() },
    });

    if (error) {
      console.error('examService: invokeGenerateExam failed', error);
      throw new Error(error.message || 'Failed to generate section. Please try again.');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('No data returned from generate-exam.');
    }

    const err = (data as { error?: string; details?: string }).error;
    if (err) {
      const details = (data as { details?: string }).details;
      throw new Error(details || err);
    }

    const id = (data as { id?: string }).id;
    const questions = (data as { questions?: unknown[] }).questions;
    if (!id || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid response from generate-exam.');
    }

    const durationMs = Math.round(performance.now() - startTime);
    trackAIGenerationSuccess(topicTrimmed, durationMs);
    return { id, questions };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    trackAIGenerationError(
      topicTrimmed,
      error instanceof Error ? error.message : String(error),
      durationMs
    );
    throw error;
  }
}

/**
 * Delete mock_tests rows by id (e.g. temporary section rows after merging into one test).
 * Requires RLS to allow delete for own rows.
 */
export async function deleteMockTestsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('mock_tests').delete().in('id', ids);
  if (error) {
    console.warn('examService: deleteMockTestsByIds failed (non-fatal)', error);
  }
}

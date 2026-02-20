import { posthog } from '../lib/posthog';

/**
 * Send a custom event to PostHog.
 */
export function trackEvent(eventName: string, properties?: object): void {
  posthog?.capture(eventName, properties);
}

/**
 * User requested an AI mock test (quiz) for a topic and difficulty.
 */
export function trackTestRequested(topic: string, difficulty: string): void {
  trackEvent('test_requested', { topic, difficulty });
}

/**
 * User answered a question (time spent and correctness).
 */
export function trackQuestionAnswered(
  topic: string,
  timeSpentMs: number,
  isCorrect: boolean
): void {
  trackEvent('question_answered', {
    topic,
    time_spent_ms: timeSpentMs,
    is_correct: isCorrect,
  });
}

/**
 * User completed a test with the given final score.
 */
export function trackTestCompleted(topic: string, finalScore: number): void {
  trackEvent('test_completed', { topic, final_score: finalScore });
}

/**
 * AI generation (generate-exam) completed successfully.
 */
export function trackAIGenerationSuccess(topic: string, durationMs: number): void {
  trackEvent('ai_generation_success', { topic, duration_ms: durationMs });
}

/**
 * AI generation (generate-exam) failed; track for latency and error-rate monitoring.
 */
export function trackAIGenerationError(
  topic: string,
  errorMessage: string,
  durationMs: number
): void {
  trackEvent('ai_generation_error', {
    topic,
    error_message: errorMessage,
    duration_ms: durationMs,
  });
}

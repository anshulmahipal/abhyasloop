import { supabase } from './supabase';
import { parseCompressedQuiz } from './quizParser';

export interface GenerateQuizResponse {
  success: boolean;
  quizId: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    difficulty: 'easy' | 'medium' | 'hard';
    explanation: string;
  }>;
}

/**
 * Generates a quiz using the AI-powered generate-quiz edge function
 * @param topic - The topic for the quiz (e.g., "Algebra", "Indian History")
 * @param difficulty - The difficulty level: "easy", "medium", or "hard"
 * @param userFocus - The user's exam focus (e.g., "SSC CGL", "Banking", "UPSC")
 * @param questionCount - Number of questions to generate (default: 5)
 * @returns Promise with quiz data including questions and quiz ID
 * @throws Error with friendly message if the function fails
 */
export async function generateQuiz(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  userFocus: string,
  questionCount: number = 5
): Promise<GenerateQuizResponse> {
  // Validate inputs
  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    throw new Error('Topic is required and must be a non-empty string');
  }

  if (!['easy', 'medium', 'hard'].includes(difficulty.toLowerCase())) {
    throw new Error('Difficulty must be one of: easy, medium, hard');
  }

  if (!userFocus || typeof userFocus !== 'string' || userFocus.trim() === '') {
    throw new Error('userFocus is required and must be a non-empty string');
  }

  // Validate questionCount
  const validCounts = [5, 10, 15, 20];
  const count = validCounts.includes(questionCount) ? questionCount : 5;

  try {
    const { data, error } = await supabase.functions.invoke('generate-quiz', {
      body: {
        topic: topic.trim(),
        difficulty: difficulty.toLowerCase(),
        userFocus: userFocus.trim(),
        questionCount: count,
      },
    });

    if (error) {
      console.error('Supabase function error:', error);
      
      // Check for 429 status code (rate limit)
      const isRateLimit = error.status === 429 || 
                         error.message?.includes('Please wait') ||
                         error.message?.includes('active quiz');
      
      // Extract friendly error message
      let errorMessage = 'Failed to generate quiz. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.context?.msg) {
        errorMessage = error.context.msg;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.details) {
          errorMessage = errorObj.details;
        } else if (errorObj.error) {
          errorMessage = typeof errorObj.error === 'string' 
            ? errorObj.error 
            : errorObj.error?.message || errorMessage;
        }
      }
      
      // Create error with rate limit flag
      const rateLimitError = new Error(errorMessage);
      (rateLimitError as any).isRateLimit = isRateLimit;
      throw rateLimitError;
    }

    // Validate response structure
    if (!data) {
      throw new Error('No data returned from quiz generation service');
    }

    // Check if response contains an error field (function returned 200 but with error)
    if (typeof data === 'object' && 'error' in data) {
      const errorData = data as { error: string; details?: string };
      const errorMessage = errorData.details || errorData.error || 'Failed to generate quiz';

      // Check for rate limit indicators in error message
      const isRateLimit = errorMessage.includes('Please wait') ||
                         errorMessage.includes('active quiz') ||
                         errorMessage.includes('1 minute');

      const rateLimitError = new Error(errorMessage);
      (rateLimitError as any).isRateLimit = isRateLimit;
      throw rateLimitError;
    }

    // Decompress and parse when backend returns gzip_base64
    if (typeof data === 'object' && data.encoding === 'gzip_base64') {
      const parsed = parseCompressedQuiz(data);
      if (!parsed) throw new Error('Invalid compressed quiz response');
      if (!parsed.quizId) throw new Error('No quiz ID in compressed response');
      if (!parsed.questions?.length) throw new Error('No questions were generated. Please try again.');
      // Map to GenerateQuizResponse shape (add id and difficulty for UI)
      return {
        success: parsed.success,
        quizId: parsed.quizId,
        questions: parsed.questions.map((q, index) => ({
          id: (q as any).id ?? `q-${index + 1}`,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          difficulty: ((q as any).difficulty ?? 'medium') as 'easy' | 'medium' | 'hard',
          explanation: q.explanation,
        })),
      };
    }

    // Validate response format (uncompressed)
    if (!data.success || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format from quiz generation service');
    }

    // Validate questions array is not empty
    if (data.questions.length === 0) {
      throw new Error('No questions were generated. Please try again.');
    }

    return data as GenerateQuizResponse;
  } catch (error) {
    // Re-throw if it's already a friendly Error
    if (error instanceof Error) {
      throw error;
    }

    // Handle unexpected error types
    console.error('Unexpected error in generateQuiz:', error);
    throw new Error('An unexpected error occurred while generating the quiz. Please try again.');
  }
}

export interface GenerateMockTestResponse {
  success: boolean;
  quizId: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    difficulty: 'easy' | 'medium' | 'hard';
    explanation: string;
  }>;
}

/**
 * Generates a mock test using the generate-mock-test edge function
 * @param subject - The subject/exam name (e.g., "Mathematics")
 * @param subTopics - Array of sub-topics to include in the mock test
 * @param difficulty - The difficulty level: "easy", "medium", or "hard"
 * @returns Promise with quiz data including questions and quiz ID
 * @throws Error with friendly message if the function fails
 */
export async function generateMockTest(
  subject: string,
  subTopics: string[],
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<GenerateMockTestResponse> {
  // Validate inputs
  if (!subject || typeof subject !== 'string' || subject.trim() === '') {
    throw new Error('Subject is required and must be a non-empty string');
  }

  if (!Array.isArray(subTopics) || subTopics.length === 0) {
    throw new Error('Sub-topics must be a non-empty array');
  }

  if (!['easy', 'medium', 'hard'].includes(difficulty.toLowerCase())) {
    throw new Error('Difficulty must be one of: easy, medium, hard');
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-mock-test', {
      body: {
        subject: subject.trim(),
        subTopics: subTopics,
        difficulty: difficulty.toLowerCase(),
      },
    });

    if (error) {
      console.error('Supabase function error:', error);
      
      // Check for 429 status code (rate limit)
      const isRateLimit = error.status === 429 || 
                         error.message?.includes('Please wait') ||
                         error.message?.includes('active quiz');
      
      // Extract friendly error message
      let errorMessage = 'Failed to generate mock test. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.context?.msg) {
        errorMessage = error.context.msg;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.details) {
          errorMessage = errorObj.details;
        } else if (errorObj.error) {
          errorMessage = typeof errorObj.error === 'string' 
            ? errorObj.error 
            : errorObj.error?.message || errorMessage;
        }
      }
      
      // Create error with rate limit flag
      const rateLimitError = new Error(errorMessage);
      (rateLimitError as any).isRateLimit = isRateLimit;
      throw rateLimitError;
    }

    // Validate response structure
    if (!data) {
      throw new Error('No data returned from mock test generation service');
    }

    // Check if response contains an error field (function returned 200 but with error)
    if (typeof data === 'object' && 'error' in data) {
      const errorData = data as { error: string; details?: string };
      const errorMessage = errorData.details || errorData.error || 'Failed to generate mock test';
      
      // Check for rate limit indicators in error message
      const isRateLimit = errorMessage.includes('Please wait') || 
                         errorMessage.includes('active quiz') ||
                         errorMessage.includes('1 minute');
      
      const rateLimitError = new Error(errorMessage);
      (rateLimitError as any).isRateLimit = isRateLimit;
      throw rateLimitError;
    }

    // Validate response format
    if (!data.success || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format from mock test generation service');
    }

    // Validate questions array is not empty
    if (data.questions.length === 0) {
      throw new Error('No questions were generated. Please try again.');
    }

    return data as GenerateMockTestResponse;
  } catch (error) {
    // Re-throw if it's already a friendly Error
    if (error instanceof Error) {
      throw error;
    }

    // Handle unexpected error types
    console.error('Unexpected error in generateMockTest:', error);
    throw new Error('An unexpected error occurred while generating the mock test. Please try again.');
  }
}

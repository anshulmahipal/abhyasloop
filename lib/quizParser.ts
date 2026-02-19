import pako from 'pako';
import base64 from 'base-64';

/** One question in minified form: [Q, A, B, C, D, Idx, Exp] */
type RawQuestionArray = [string, string, string, string, string, number, string];

export interface ParsedQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface ParseCompressedQuizResult {
  success: boolean;
  quizId: string;
  questions: ParsedQuestion[];
}

/**
 * Converts a single raw array [Q, A, B, C, D, Idx, Exp] into the app's question object format.
 */
function rawArrayToQuestion(raw: unknown, index: number): ParsedQuestion {
  if (!Array.isArray(raw) || raw.length < 7) {
    throw new Error(`Invalid question at index ${index}: expected 7 elements [Q, A, B, C, D, Idx, Exp]`);
  }
  const [q, a, b, c, d, idx, exp] = raw as RawQuestionArray;
  const correctIndex = Number(idx);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error(`Invalid correctIndex at index ${index}: ${idx}`);
  }
  return {
    question: String(q ?? ''),
    options: [String(a ?? ''), String(b ?? ''), String(c ?? ''), String(d ?? '')],
    correctIndex,
    explanation: String(exp ?? ''),
  };
}

/**
 * Checks if a value is a minified question row (array of 7 elements).
 */
function isRawQuestionRow(value: unknown): value is RawQuestionArray {
  return Array.isArray(value) && value.length >= 7;
}

/**
 * Fetches, decompresses, and parses quiz data when the response uses gzip_base64 encoding.
 * Converts minified arrays [Q, A, B, C, D, Idx, Exp] into the object format the UI expects.
 *
 * @param response - The raw response from the quiz API (e.g. Supabase function).
 * @returns Parsed result with success, quizId, and questions in app format, or null if not gzip_base64.
 */
export function parseCompressedQuiz(response: any): ParseCompressedQuizResult | null {
  if (!response || response.encoding !== 'gzip_base64') {
    return null;
  }

  const base64Data = response.data;
  if (typeof base64Data !== 'string') {
    throw new Error('Compressed quiz response missing or invalid "data" string');
  }

  // Decode: Base64 -> binary string
  const binaryString = base64.decode(base64Data);

  // Decompress: gzip -> string
  const uint8 = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8[i] = binaryString.charCodeAt(i);
  }
  const decompressed = pako.ungzip(uint8, { to: 'string' });

  // Parse JSON
  const parsed: unknown = JSON.parse(decompressed);

  // Top-level array of arrays: minified format
  if (Array.isArray(parsed) && parsed.length > 0 && isRawQuestionRow(parsed[0])) {
    const questions = (parsed as RawQuestionArray[]).map((raw, i) => rawArrayToQuestion(raw, i));
    return {
      success: true,
      quizId: (response as any).quizId ?? '',
      questions,
    };
  }

  // Object with .questions as array of raw arrays
  if (
    parsed &&
    typeof parsed === 'object' &&
    'questions' in parsed &&
    Array.isArray((parsed as any).questions) &&
    (parsed as any).questions.length > 0 &&
    isRawQuestionRow((parsed as any).questions[0])
  ) {
    const obj = parsed as { success?: boolean; quizId?: string; questions: RawQuestionArray[] };
    const questions = obj.questions.map((raw, i) => rawArrayToQuestion(raw, i));
    return {
      success: obj.success ?? true,
      quizId: obj.quizId ?? '',
      questions,
    };
  }

  // Already full object format: { success, quizId, questions: [ { question, options, ... } ] }
  if (
    parsed &&
    typeof parsed === 'object' &&
    'questions' in parsed &&
    Array.isArray((parsed as any).questions)
  ) {
    const obj = parsed as ParseCompressedQuizResult;
    return {
      success: obj.success ?? true,
      quizId: obj.quizId ?? '',
      questions: obj.questions,
    };
  }

  throw new Error('Compressed quiz payload has unknown format after decompression');
}

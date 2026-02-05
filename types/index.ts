export interface Question {
  id: string | number; // UUID string from database, or number for compatibility
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  user_answer?: number; // User's selected answer index (0-3), added when user selects an option
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
}

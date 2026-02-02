export interface Question {
  id: string | number; // UUID string from database, or number for compatibility
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
}

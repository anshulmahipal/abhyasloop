export interface Question {
  id: number;
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

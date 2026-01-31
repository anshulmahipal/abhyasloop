import { useState } from 'react';
import { Question } from '../types';

interface UseQuizLogicProps {
  questions: Question[];
  onQuizComplete: (score: number, total: number) => void;
}

export function useQuizLogic({ questions, onQuizComplete }: UseQuizLogicProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hasUserAnswered, setHasUserAnswered] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleOptionSelect = (optionIndex: number) => {
    if (hasUserAnswered) return;

    setSelectedOptionIndex(optionIndex);
    setHasUserAnswered(true);

    if (optionIndex === currentQuestion.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (!hasUserAnswered) return;

    if (isLastQuestion) {
      onQuizComplete(score, questions.length);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOptionIndex(null);
      setHasUserAnswered(false);
    }
  };

  const getOptionState = (optionIndex: number): 'default' | 'selected' | 'correct' | 'incorrect' => {
    if (!hasUserAnswered) {
      return selectedOptionIndex === optionIndex ? 'selected' : 'default';
    }

    if (optionIndex === currentQuestion.correctIndex) {
      return 'correct';
    }

    if (selectedOptionIndex === optionIndex && optionIndex !== currentQuestion.correctIndex) {
      return 'incorrect';
    }

    return 'default';
  };

  return {
    currentQuestion,
    currentQuestionIndex,
    selectedOptionIndex,
    score,
    hasUserAnswered,
    isLastQuestion,
    progressPercentage,
    handleOptionSelect,
    handleNext,
    getOptionState,
  };
}

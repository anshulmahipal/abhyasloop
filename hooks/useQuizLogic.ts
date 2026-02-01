import { useState, useEffect } from 'react';
import { Question } from '../types';
import { logger } from '../lib/logger';

interface UseQuizLogicProps {
  questions: Question[];
  onQuizComplete: (score: number, total: number) => void;
  userInfo?: { id?: string | number; name?: string };
}

export function useQuizLogic({ questions, onQuizComplete, userInfo }: UseQuizLogicProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hasUserAnswered, setHasUserAnswered] = useState(false);

  // Reset quiz state when questions change
  useEffect(() => {
    if (questions.length > 0) {
      console.log('Questions changed, resetting quiz state. Questions count:', questions.length);
      setCurrentQuestionIndex(0);
      setSelectedOptionIndex(null);
      setScore(0);
      setHasUserAnswered(false);
    }
  }, [questions.length]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleOptionSelect = (optionIndex: number) => {
    if (hasUserAnswered) return;

    logger.userAction('Option Selected', userInfo, {
      questionId: currentQuestion.id,
      questionIndex: currentQuestionIndex,
      selectedOption: optionIndex,
      correctOption: currentQuestion.correctIndex,
    });

    setSelectedOptionIndex(optionIndex);
    setHasUserAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      logger.info('Correct Answer', {
        questionId: currentQuestion.id,
        newScore: score + 1,
      });
    } else {
      logger.warn('Incorrect Answer', {
        questionId: currentQuestion.id,
        selected: optionIndex,
        correct: currentQuestion.correctIndex,
      });
    }
  };

  const handleNext = () => {
    if (!hasUserAnswered) return;

    logger.userAction('Next Button Pressed', userInfo, {
      currentQuestionIndex,
      isLastQuestion,
      currentScore: score,
    });

    if (isLastQuestion) {
      logger.group('Quiz Completed', () => {
        logger.info('Final Score', { score, total: questions.length });
        logger.info('Percentage', {
          percentage: Math.round((score / questions.length) * 100),
        });
      });
      onQuizComplete(score, questions.length);
    } else {
      logger.debug('Moving to Next Question', {
        from: currentQuestionIndex,
        to: currentQuestionIndex + 1,
      });
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

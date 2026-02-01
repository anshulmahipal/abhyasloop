import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTimer } from '../../../hooks/useTimer';
import { useQuizLogic } from '../../../hooks/useQuizLogic';
import { QuizOption } from '../../../components/QuizOption';
import { ProgressBar } from '../../../components/ProgressBar';
import { DifficultyBadge } from '../../../components/DifficultyBadge';
import { logger } from '../../../lib/logger';
import { generateQuiz } from '../../../lib/api';
import { Question } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ];
}

export default function QuizPage() {
  const params = useLocalSearchParams<{ 
    id?: string; 
    topic?: string; 
    difficulty?: 'easy' | 'medium' | 'hard' 
  }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { timer, formatTime } = useTimer(true);
  const { user } = useAuth();

  // Get topic and difficulty from params, with defaults
  const topic = params.topic || 'General Knowledge';
  const difficulty = (params.difficulty || 'medium') as 'easy' | 'medium' | 'hard';

  const userInfo = {
    id: params.id || 'unknown',
    name: 'Quiz User',
  };

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await logger.apiCallAsync(
        'Generate Quiz',
        async () => {
          return await generateQuiz(topic, difficulty);
        },
        {
          url: 'generate-quiz',
          method: 'POST',
          userInfo,
        }
      );

      console.log('Quiz API response:', response);
      console.log('Response questions:', response.questions);
      console.log('Questions count:', response.questions?.length);

      // Validate response has questions
      if (!response.questions || !Array.isArray(response.questions) || response.questions.length === 0) {
        console.error('Invalid or empty questions array:', response);
        throw new Error('No questions received from the quiz service');
      }

      // Map API response to Question interface format
      // Note: API returns UUID string IDs, but Question type expects number IDs
      // Using index+1 for now to match existing type, but could update type later
      const mappedQuestions: Question[] = response.questions.map((q: any, index: number) => {
        console.log(`Mapping question ${index}:`, q);
        
        // Validate question structure
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          console.error(`Invalid question at index ${index}:`, q);
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
          console.error(`Invalid correctIndex at index ${index}:`, q.correctIndex);
          throw new Error(`Invalid correctIndex at index ${index}`);
        }
        
        return {
          id: index + 1,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          difficulty: (q.difficulty?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard',
          explanation: q.explanation || '',
        };
      });

      console.log('Mapped questions:', mappedQuestions);
      console.log('Mapped questions count:', mappedQuestions.length);
      console.log('First question:', mappedQuestions[0]);

      if (mappedQuestions.length === 0) {
        throw new Error('No valid questions after mapping');
      }

      setQuestions(mappedQuestions);
      setQuizId(response.quizId);
      setUserAnswers(new Array(mappedQuestions.length).fill(null));
      console.log('Questions state set, count:', mappedQuestions.length);
      logger.info('Quiz loaded successfully', { 
        questionCount: mappedQuestions.length,
        quizId: response.quizId,
        topic,
        difficulty,
      });
    } catch (err) {
      logger.error('Failed to generate quiz', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to generate quiz. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [topic, difficulty]);

  const handleQuizSubmit = async () => {
    if (!quizId || !user) {
      Alert.alert('Error', 'Unable to submit quiz. Please try again.');
      logger.error('Quiz submission failed: missing quizId or user', { quizId, userId: user?.id });
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate score by comparing userAnswers with correct answers
      let score = 0;
      for (let i = 0; i < questions.length; i++) {
        if (userAnswers[i] !== null && userAnswers[i] === questions[i].correctIndex) {
          score++;
        }
      }

      const totalQuestions = questions.length;

      logger.info('Calculating quiz score', {
        score,
        totalQuestions,
        userAnswers,
        quizId,
      });

      // Save to quiz_attempts table
      const { data: attemptData, error: insertError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score: score,
          total_questions: totalQuestions,
        })
        .select('id')
        .single();

      if (insertError || !attemptData) {
        console.error('Error saving quiz attempt:', insertError);
        logger.error('Failed to save quiz attempt', insertError);
        Alert.alert('Error', 'Failed to save your quiz results. Please try again.');
        setIsSubmitting(false);
        return;
      }

      logger.userAction('Quiz Submitted', userInfo, {
        attemptId: attemptData.id,
        score,
        totalQuestions,
        quizId,
      });

      // Navigate to result screen with attemptId
      router.replace({
        pathname: '/(protected)/result',
        params: {
          attemptId: attemptData.id,
        },
      });
    } catch (err) {
      logger.error('Quiz submission error', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Reset userAnswers when questions change
  useEffect(() => {
    if (questions.length > 0) {
      setUserAnswers(new Array(questions.length).fill(null));
    }
  }, [questions.length]);

  // Debug: Log questions state
  useEffect(() => {
    console.log('Questions state updated:', {
      questionsCount: questions.length,
      questions: questions,
    });
  }, [questions]);

  const {
    currentQuestion,
    currentQuestionIndex,
    selectedOptionIndex,
    score,
    hasUserAnswered,
    isLastQuestion,
    progressPercentage,
    handleOptionSelect: originalHandleOptionSelect,
    handleNext: originalHandleNext,
    getOptionState,
  } = useQuizLogic({
    questions,
    onQuizComplete: () => {}, // We'll handle completion ourselves
    userInfo,
  });

  // Override handleOptionSelect to track answers in userAnswers array
  const handleOptionSelect = (optionIndex: number) => {
    originalHandleOptionSelect(optionIndex);
    // Update userAnswers array with the selected answer for current question
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  // Override handleNext to handle submission on last question
  const handleNext = () => {
    if (!hasUserAnswered) return;

    if (isLastQuestion) {
      // On last question, submit the quiz
      handleQuizSubmit();
    } else {
      // Otherwise, proceed to next question
      originalHandleNext();
    }
  };

  // Debug: Log current question
  useEffect(() => {
    console.log('Current question:', currentQuestion);
  }, [currentQuestion]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchQuiz}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No questions available</Text>
      </View>
    );
  }

  // Safety check: ensure currentQuestion exists
  if (!currentQuestion) {
    console.error('currentQuestion is undefined:', { questions, currentQuestionIndex });
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error loading question. Please try again.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchQuiz}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('Rendering quiz UI with question:', currentQuestionIndex + 1, 'of', questions.length);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
        <View style={styles.header}>
          <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>⏱️ {formatTime(timer)}</Text>
          </View>
        </View>

        <View style={styles.questionSection}>
          <DifficultyBadge difficulty={currentQuestion.difficulty} />
          <Text style={[styles.questionText, isMobile && styles.questionTextMobile]}>
            {currentQuestion.question}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <QuizOption
              key={index}
              option={option}
              optionIndex={index}
              state={getOptionState(index)}
              onPress={() => handleOptionSelect(index)}
              disabled={hasUserAnswered}
              fontSize={isMobile ? 16 : 18}
            />
          ))}
        </View>

        {hasUserAnswered && (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>Explanation:</Text>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextButton, (!hasUserAnswered || isSubmitting) && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!hasUserAnswered || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingVertical: 30,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  containerMobile: {
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  timerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  questionSection: {
    marginBottom: 30,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 32,
  },
  questionTextMobile: {
    fontSize: 20,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  explanationContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

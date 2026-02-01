import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';
import { DifficultyBadge } from '../../../../components/DifficultyBadge';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizAttemptWithQuestions {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  user_answers: number[] | null;
  generated_quizzes: {
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questions: Question[];
  } | null;
}

export default function ReviewPage() {
  const params = useLocalSearchParams<{ attemptId?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [attemptData, setAttemptData] = useState<QuizAttemptWithQuestions | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviewData = async () => {
      if (!params.attemptId) {
        setError('No attempt ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch quiz_attempts row by ID with user_answers
        const { data: attemptData, error: attemptError } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            generated_quizzes (
              topic,
              difficulty,
              questions (
                id,
                question_text,
                options,
                correct_index,
                explanation,
                difficulty
              )
            )
          `)
          .eq('id', params.attemptId)
          .single();

        if (attemptError || !attemptData) {
          console.error('Error fetching quiz attempt:', attemptError);
          logger.error('Failed to fetch quiz attempt', attemptError);
          throw new Error('Failed to load quiz review');
        }

        // Sort questions by created_at to maintain order (if available) or by id
        const questions = attemptData.generated_quizzes?.questions || [];
        const sortedQuestions = [...questions].sort((a, b) => {
          // If questions have created_at, sort by that, otherwise by id
          return a.id.localeCompare(b.id);
        });

        setAttemptData({
          ...attemptData,
          generated_quizzes: attemptData.generated_quizzes
            ? {
                ...attemptData.generated_quizzes,
                questions: sortedQuestions,
              }
            : null,
        });

        logger.info('Review data loaded', {
          attemptId: params.attemptId,
          questionCount: sortedQuestions.length,
        });
      } catch (err) {
        logger.error('Failed to load review data', err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to load quiz review. Please try again.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewData();
  }, [params.attemptId]);

  const handleClose = () => {
    logger.userAction('Close Review', {}, {});
    router.replace('/(protected)/dashboard');
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    const questions = attemptData?.generated_quizzes?.questions || [];
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading quiz review...</Text>
      </View>
    );
  }

  if (error || !attemptData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error || 'Failed to load review'}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleClose}
        >
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const questions = attemptData.generated_quizzes?.questions || [];
  
  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No questions found for this quiz</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleClose}
        >
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const userAnswers = attemptData.user_answers || [];
  const userSelectedIndex = currentQuestionIndex < userAnswers.length 
    ? (userAnswers[currentQuestionIndex] === -1 ? null : userAnswers[currentQuestionIndex])
    : null;
  const correctIndex = currentQuestion.correct_index;
  const isCorrect = userSelectedIndex !== null && userSelectedIndex === correctIndex;

  const getOptionState = (optionIndex: number): 'default' | 'user-selected-correct' | 'user-selected-incorrect' | 'correct' => {
    // Always highlight correct answer in green
    if (optionIndex === correctIndex) {
      return 'correct';
    }
    
    // If user selected this option
    if (userSelectedIndex === optionIndex) {
      return isCorrect ? 'user-selected-correct' : 'user-selected-incorrect';
    }
    
    return 'default';
  };

  const optionLabel = (index: number) => String.fromCharCode(65 + index);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isMobile ? styles.contentMobile : styles.contentDesktop]}>
          {/* Question Info */}
          {attemptData.generated_quizzes && (
            <View style={styles.quizInfo}>
              <DifficultyBadge difficulty={attemptData.generated_quizzes.difficulty} />
              <Text style={styles.topicText}>{attemptData.generated_quizzes.topic}</Text>
            </View>
          )}

          {/* Question */}
          <View style={styles.questionSection}>
            <Text style={[styles.questionText, isMobile && styles.questionTextMobile]}>
              {currentQuestion.question_text}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const state = getOptionState(index);
              const isUserSelected = userSelectedIndex === index;
              const isCorrectAnswer = index === correctIndex;

              return (
                <View
                  key={index}
                  style={[
                    styles.option,
                    state === 'correct' && styles.optionCorrect,
                    state === 'user-selected-correct' && styles.optionUserCorrect,
                    state === 'user-selected-incorrect' && styles.optionUserIncorrect,
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    (isCorrectAnswer || isUserSelected) && styles.optionTextBold,
                  ]}>
                    {optionLabel(index)}. {option}
                  </Text>
                  {isCorrectAnswer && (
                    <Text style={styles.correctMark}>✓</Text>
                  )}
                  {isUserSelected && !isCorrectAnswer && (
                    <Text style={styles.incorrectMark}>✗</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Explanation Box */}
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>💡 Solution:</Text>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>

          {/* Navigation */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, currentQuestionIndex === questions.length - 1 && styles.navButtonDisabled]}
              onPress={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              <Text style={[styles.navButtonText, currentQuestionIndex === questions.length - 1 && styles.navButtonTextDisabled]}>
                Next →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 80,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingVertical: 30,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  contentMobile: {
    paddingHorizontal: 20,
  },
  contentDesktop: {
    paddingHorizontal: 40,
  },
  quizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  topicText: {
    fontSize: 18,
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
    marginBottom: 24,
  },
  option: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCorrect: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  optionUserCorrect: {
    backgroundColor: '#c8e6c9',
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  optionUserIncorrect: {
    backgroundColor: '#ffcdd2',
    borderColor: '#F44336',
    borderWidth: 3,
  },
  optionText: {
    fontSize: 18,
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  optionTextBold: {
    fontWeight: '600',
  },
  correctMark: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  incorrectMark: {
    fontSize: 24,
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  explanationContainer: {
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  explanationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 30,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
});

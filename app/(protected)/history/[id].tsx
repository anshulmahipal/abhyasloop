import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { useAuth } from '../../../contexts/AuthContext';
import { DifficultyBadge } from '../../../components/DifficultyBadge';
import { Question } from '../../../types';

interface QuizHistoryDetail {
  id: string;
  topic: string;
  score: number;
  total_questions: number;
  difficulty: string;
  quiz_data: Question[];
  created_at: string;
}

export default function HistoryDetailPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { user } = useAuth();

  const [historyItem, setHistoryItem] = useState<QuizHistoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchHistoryDetail();
    }
  }, [params.id, user]);

  const fetchHistoryDetail = async () => {
    if (!params.id || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First try to fetch from quiz_history table
      let data = null;
      let fetchError = null;

      const { data: historyData, error: historyError } = await supabase
        .from('quiz_history')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (historyError) {
        // If PGRST116 (no rows), try quiz_attempts as fallback
        if (historyError.code === 'PGRST116') {
          logger.info('Quiz not found in quiz_history, trying quiz_attempts', { id: params.id });
          
          // Try fetching from quiz_attempts instead (for older attempts)
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
            .eq('id', params.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (attemptError) {
            console.error('Error fetching quiz attempt:', attemptError);
            logger.error('Failed to fetch quiz attempt', attemptError);
            throw new Error('Quiz not found. It may have been deleted or you may not have access to it.');
          }

          if (!attemptData) {
            throw new Error('Quiz not found. It may have been deleted or you may not have access to it.');
          }

          // Transform quiz_attempts data to match QuizHistoryDetail format
          const quizData = attemptData.generated_quizzes?.questions?.map((q: any) => ({
            id: q.id,
            question: q.question_text || '',
            options: q.options || [],
            correctIndex: q.correct_index ?? 0,
            difficulty: q.difficulty || attemptData.generated_quizzes?.difficulty || 'medium',
            explanation: q.explanation || '',
            user_answer: attemptData.user_answers?.[attemptData.generated_quizzes?.questions?.indexOf(q) || 0] !== undefined
              ? (attemptData.user_answers[attemptData.generated_quizzes?.questions?.indexOf(q) || 0] === -1 
                  ? undefined 
                  : attemptData.user_answers[attemptData.generated_quizzes?.questions?.indexOf(q) || 0])
              : undefined,
          })) || [];

          data = {
            id: attemptData.id,
            topic: attemptData.generated_quizzes?.topic || 'Unknown',
            score: attemptData.score,
            total_questions: attemptData.total_questions,
            difficulty: attemptData.generated_quizzes?.difficulty || 'medium',
            quiz_data: quizData,
            created_at: attemptData.completed_at,
          } as QuizHistoryDetail;
        } else {
          console.error('Error fetching quiz history detail:', historyError);
          logger.error('Failed to fetch quiz history detail', historyError);
          throw new Error('Failed to load quiz details');
        }
      } else {
        data = historyData;
      }

      if (!data) {
        throw new Error('Quiz not found. It may have been deleted or you may not have access to it.');
      }

      setHistoryItem(data as QuizHistoryDetail);
      logger.info('Quiz history detail loaded', { id: params.id });
    } catch (err) {
      logger.error('Failed to load quiz history detail', err);
      
      // Extract error message with better handling
      let errorMessage = 'Failed to load quiz details. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getOptionState = (question: Question, optionIndex: number): 'default' | 'correct' | 'user-correct' | 'user-incorrect' => {
    const correctIndex = question.correctIndex;
    const userAnswer = question.user_answer;

    // Always highlight correct answer in green
    if (optionIndex === correctIndex) {
      return 'correct';
    }

    // If user selected this option
    if (userAnswer !== undefined && userAnswer === optionIndex) {
      return userAnswer === correctIndex ? 'user-correct' : 'user-incorrect';
    }

    return 'default';
  };

  const optionLabel = (index: number) => String.fromCharCode(65 + index);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Review</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF512F" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !historyItem) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Review</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF512F" />
          <Text style={styles.errorText}>⚠️ {error || 'Quiz not found'}</Text>
          <Text style={styles.errorSubtext}>
            {error?.includes('not found') 
              ? 'This quiz may have been deleted or you may not have access to it.'
              : 'We couldn\'t load this quiz. Please try again.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchHistoryDetail}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backToHistoryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backToHistoryButtonText}>Back to History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const questions = historyItem.quiz_data || [];
  const difficulty = historyItem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
  const percentage = Math.round((historyItem.score / historyItem.total_questions) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz Review</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quiz Info Header */}
        <View style={styles.quizInfoCard}>
          <View style={styles.quizInfoRow}>
            <DifficultyBadge difficulty={difficulty} />
            <Text style={styles.topicText}>{historyItem.topic}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>
              Score: {historyItem.score}/{historyItem.total_questions} ({percentage}%)
            </Text>
          </View>
        </View>

        {/* Questions List */}
        {questions.map((question, questionIndex) => {
          const isCorrect = question.user_answer !== undefined && question.user_answer === question.correctIndex;
          const userSelectedIndex = question.user_answer;

          return (
            <View key={question.id || questionIndex} style={styles.questionCard}>
              {/* Question Number and Status */}
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>
                  Question {questionIndex + 1} of {questions.length}
                </Text>
                {isCorrect ? (
                  <View style={styles.correctBadge}>
                    <Text style={styles.correctBadgeText}>✓ Correct</Text>
                  </View>
                ) : (
                  <View style={styles.incorrectBadge}>
                    <Text style={styles.incorrectBadgeText}>✗ Incorrect</Text>
                  </View>
                )}
              </View>

              {/* Question Text */}
              <Text style={[styles.questionText, isMobile && styles.questionTextMobile]}>
                {question.question}
              </Text>

              {/* Options */}
              <View style={styles.optionsContainer}>
                {question.options.map((option, optionIndex) => {
                  const state = getOptionState(question, optionIndex);
                  const isCorrectAnswer = optionIndex === question.correctIndex;
                  const isUserSelected = userSelectedIndex === optionIndex;

                  return (
                    <View
                      key={optionIndex}
                      style={[
                        styles.option,
                        state === 'correct' && styles.optionCorrect,
                        state === 'user-correct' && styles.optionUserCorrect,
                        state === 'user-incorrect' && styles.optionUserIncorrect,
                      ]}
                    >
                      <Text style={[
                        styles.optionText,
                        (isCorrectAnswer || isUserSelected) && styles.optionTextBold,
                      ]}>
                        {optionLabel(optionIndex)}. {option}
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
              {question.explanation && (
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationTitle}>💡 Solution:</Text>
                  <Text style={styles.explanationText}>{question.explanation}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#FF512F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF512F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToHistoryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToHistoryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  quizInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  topicText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  scoreRow: {
    marginTop: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  correctBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  correctBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  incorrectBadge: {
    backgroundColor: '#F44336',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  incorrectBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 28,
    marginBottom: 20,
  },
  questionTextMobile: {
    fontSize: 18,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  optionUserCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  optionUserIncorrect: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  optionTextBold: {
    fontWeight: '700',
  },
  correctMark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: '700',
    marginLeft: 12,
  },
  incorrectMark: {
    fontSize: 20,
    color: '#F44336',
    fontWeight: '700',
    marginLeft: 12,
  },
  explanationContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
});

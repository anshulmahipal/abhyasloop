import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface QuizAttemptWithQuiz {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  generated_quizzes: {
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
  } | null;
}

export default function ResultPage() {
  // Read attemptId from search parameters (query params)
  const params = useLocalSearchParams<{ attemptId?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [attemptData, setAttemptData] = useState<QuizAttemptWithQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResultData = async () => {
      if (!params.attemptId) {
        setError('No attempt ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch quiz_attempts row by ID and join generated_quizzes to get topic and difficulty
        const { data, error: fetchError } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            generated_quizzes (
              topic,
              difficulty
            )
          `)
          .eq('id', params.attemptId)
          .single();

        if (fetchError || !data) {
          console.error('Error fetching quiz attempt:', fetchError);
          logger.error('Failed to fetch quiz attempt', fetchError);
          throw new Error('Failed to load quiz results');
        }

        setAttemptData(data as QuizAttemptWithQuiz);

        logger.info('Result data loaded', {
          attemptId: params.attemptId,
          score: data.score,
          totalQuestions: data.total_questions,
        });
      } catch (err) {
        logger.error('Failed to load result data', err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to load quiz results. Please try again.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResultData();
  }, [params.attemptId]);

  const handleBackToDashboard = () => {
    logger.userAction('Back to Dashboard', {}, {});
    router.replace('/(protected)/dashboard');
  };

  const handleTryAnotherQuiz = () => {
    logger.userAction('Try Another Quiz', {}, {});
    router.replace('/(protected)/quiz/config');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  if (error || !attemptData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error || 'Failed to load results'}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleBackToDashboard}
        >
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const percentage = (attemptData.score / attemptData.total_questions) * 100;
  
  // Determine message based on percentage
  let message = '';
  if (percentage > 80) {
    message = 'Excellent work!';
  } else if (percentage < 50) {
    message = 'Keep practicing!';
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
        {/* Header */}
        <Text style={styles.header}>Quiz Completed!</Text>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          {/* Big, bold display of score / total_questions */}
          <Text style={styles.scoreDisplay}>
            {attemptData.score} / {attemptData.total_questions}
          </Text>
          
          {/* Percentage */}
          <Text style={styles.percentage}>{Math.round(percentage)}%</Text>

          {/* Message */}
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
        </View>

        {/* Quiz Details */}
        {attemptData.generated_quizzes && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Quiz Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Topic:</Text>
              <Text style={styles.detailValue}>{attemptData.generated_quizzes.topic}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Difficulty:</Text>
              <Text style={styles.detailValue}>
                {attemptData.generated_quizzes.difficulty.charAt(0).toUpperCase() + 
                 attemptData.generated_quizzes.difficulty.slice(1)}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleBackToDashboard}
          >
            <Text style={styles.buttonSecondaryText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              logger.userAction('Review Answers', {}, {});
              router.push(`/(protected)/quiz/review/${params.attemptId}`);
            }}
          >
            <Text style={styles.buttonText}>Review Answers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleTryAnotherQuiz}
          >
            <Text style={styles.buttonText}>Try Another Quiz</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  containerMobile: {
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingHorizontal: 40,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 32,
  },
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  scoreDisplay: {
    fontSize: 72,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  percentage: {
    fontSize: 48,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  actionsContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  buttonSecondaryText: {
    color: '#007AFF',
    fontSize: 18,
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

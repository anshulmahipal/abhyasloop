import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { CircularProgress } from '../../components/CircularProgress';
import { DifficultyBadge } from '../../components/DifficultyBadge';
import { logger } from '../../lib/logger';

interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface GeneratedQuiz {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export default function ResultPage() {
  const params = useLocalSearchParams<{ attemptId?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
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

        // Fetch quiz attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('id', params.attemptId)
          .single();

        if (attemptError || !attemptData) {
          console.error('Error fetching quiz attempt:', attemptError);
          logger.error('Failed to fetch quiz attempt', attemptError);
          throw new Error('Failed to load quiz results');
        }

        setAttempt(attemptData as QuizAttempt);

        // Fetch related quiz data
        const { data: quizData, error: quizError } = await supabase
          .from('generated_quizzes')
          .select('*')
          .eq('id', attemptData.quiz_id)
          .single();

        if (quizError || !quizData) {
          console.error('Error fetching quiz data:', quizError);
          logger.error('Failed to fetch quiz data', quizError);
          // Don't throw - we can still show the score without quiz details
        } else {
          setQuiz(quizData as GeneratedQuiz);
        }

        logger.info('Result data loaded', {
          attemptId: params.attemptId,
          score: attemptData.score,
          totalQuestions: attemptData.total_questions,
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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  if (error || !attempt) {
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

  const percentage = (attempt.score / attempt.total_questions) * 100;
  const showCircularProgress = quiz?.difficulty === 'easy';

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Quiz Complete!</Text>
          <Text style={styles.scoreText}>
            You scored {attempt.score} out of {attempt.total_questions}
          </Text>
          
          {/* Circular progress for easy difficulty, text for others */}
          {showCircularProgress ? (
            <View style={styles.progressContainer}>
              <CircularProgress
                percentage={percentage}
                size={180}
                strokeWidth={18}
                color="#007AFF"
                backgroundColor="#e0e0e0"
              />
            </View>
          ) : (
            <View style={styles.percentageContainer}>
              <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
            </View>
          )}
        </View>

        {/* Quiz Details */}
        {quiz && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Quiz Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Topic:</Text>
              <Text style={styles.detailValue}>{quiz.topic}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Difficulty:</Text>
              <View style={styles.badgeContainer}>
                <DifficultyBadge difficulty={quiz.difficulty} />
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>
                {new Date(attempt.completed_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Back to Dashboard Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleBackToDashboard}
        >
          <Text style={styles.buttonText}>Back to Dashboard</Text>
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
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
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
  scoreTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    marginVertical: 20,
  },
  percentageContainer: {
    marginVertical: 20,
  },
  percentageText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#007AFF',
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
  badgeContainer: {
    flex: 1,
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

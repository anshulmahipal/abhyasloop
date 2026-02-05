import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../contexts/AuthContext';
import { saveMistakes } from '../../lib/mistakeSync';

interface Question {
  id: string;
  question_text?: string;
  options?: string[];
  correct_index?: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  user_answer?: number; // Added when merging with user_answers
  time_taken?: number; // Time taken to answer in seconds
}

interface QuizAttemptWithQuiz {
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

export default function ResultPage() {
  // Read attemptId and timeTaken from search parameters (query params)
  const params = useLocalSearchParams<{ attemptId?: string; timeTaken?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { session, user } = useAuth();

  const [attemptData, setAttemptData] = useState<QuizAttemptWithQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [avgTimePerQuestion, setAvgTimePerQuestion] = useState<number>(0);
  const [incorrectCount, setIncorrectCount] = useState<number>(0);

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

        // Fetch quiz_attempts row by ID and join generated_quizzes to get topic, difficulty, and full question data
        const { data, error: fetchError } = await supabase
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

  // Hide tab bar when result screen is active
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        headerShown: false,
        tabBarStyle: { display: 'none' },
      });
    }

    // Restore tab bar when component unmounts
    return () => {
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.setOptions({
          headerShown: undefined,
          tabBarStyle: undefined,
        });
      }
    };
  }, [navigation]);

  // Calculate analytics and rewards when attemptData is loaded
  useEffect(() => {
    if (!attemptData || !session?.user) {
      return;
    }

    // Parse time_taken array from URL params if available
    let timeTakenArray: number[] = [];
    if (params.timeTaken) {
      try {
        timeTakenArray = JSON.parse(decodeURIComponent(params.timeTaken));
      } catch (e) {
        console.error('Error parsing timeTaken param:', e);
      }
    }

    // Calculate analytics
    const userAnswers = attemptData.user_answers || [];
    const questions = attemptData.generated_quizzes?.questions || [];

    // Filter incorrect answers for mistakes
    const incorrectQuestions = questions.filter((q, index) => {
      const userAnswer = index < userAnswers.length ? userAnswers[index] : null;
      const userAnswerValue = userAnswer !== null && userAnswer !== -1 ? userAnswer : undefined;
      // Only include questions where user answered and got it wrong
      return userAnswerValue !== undefined && userAnswerValue !== q.correct_index;
    });

    // Calculate average time per question
    const totalTime = timeTakenArray.reduce((sum, time) => sum + time, 0);
    const avgTime = timeTakenArray.length > 0 ? Math.round(totalTime / timeTakenArray.length) : 0;
    setAvgTimePerQuestion(avgTime);
    setIncorrectCount(incorrectQuestions.length);

    // Save mistakes to database (bulk insert)
    if (incorrectQuestions.length > 0 && user) {
      const mistakesToSave = incorrectQuestions.map((q) => ({
        user_id: user.id,
        question_id: q.id,
      }));

      // Save mistakes using the robust sync utility (runs in background)
      saveMistakes(user.id, mistakesToSave).catch((err: unknown) => {
        console.error('Error saving mistakes:', err);
        logger.error('Failed to save mistakes', err);
      });

      logger.info('Mistakes saved', {
        count: incorrectQuestions.length,
        attemptId: params.attemptId,
      });
    }
  }, [attemptData, session?.user?.id, params.timeTaken, params.attemptId, user]);

  // Calculate rewards and save progress when attemptData is loaded
  useEffect(() => {
    if (!attemptData || !session?.user || isSaved) {
      return;
    }

    const calculateAndSaveRewards = async () => {
      // Calculate rewards
      const correctCount = attemptData.score;
      const calculatedCoins = correctCount * 10;
      const calculatedXp = correctCount * 20;

      setCoinsEarned(calculatedCoins);
      setXpEarned(calculatedXp);

      // Save progress
      await saveProgress(calculatedCoins, calculatedXp);
    };

    calculateAndSaveRewards();
  }, [attemptData, session?.user?.id, isSaved]);

  const saveProgress = async (coins: number, xp: number) => {
    if (!session?.user || isSaved || !attemptData) {
      return;
    }

    try {
      // Save coins and XP via RPC
      const { error: rpcError } = await supabase.rpc('finish_quiz', {
        p_user_id: session.user.id,
        p_coins_earned: coins,
        p_xp_earned: xp,
      });

      if (rpcError) {
        console.error('Error saving progress:', rpcError);
        logger.error('Failed to save progress', rpcError);
        // Don't show error to user, just log it
        return;
      }

      // Save quiz session to quiz_history
      const topic = attemptData.generated_quizzes?.topic || 'General';
      const difficulty = attemptData.generated_quizzes?.difficulty || 'medium';
      const correctCount = attemptData.score;
      const total = attemptData.total_questions;
      const userAnswers = attemptData.user_answers || [];
      const questions = attemptData.generated_quizzes?.questions || [];

      // Parse time_taken array from URL params if available
      let timeTakenArray: number[] = [];
      if (params.timeTaken) {
        try {
          timeTakenArray = JSON.parse(decodeURIComponent(params.timeTaken));
        } catch (e) {
          console.error('Error parsing timeTaken param:', e);
        }
      }

      // Merge user_answers with questions to create quiz_data with user_answer and time_taken properties
      const quizData = questions.map((question, index) => {
        const userAnswer = index < userAnswers.length ? userAnswers[index] : null;
        // Convert -1 (unanswered) to undefined for user_answer
        const userAnswerValue = userAnswer !== null && userAnswer !== -1 ? userAnswer : undefined;
        const timeTaken = index < timeTakenArray.length ? timeTakenArray[index] : undefined;
        
        return {
          id: question.id,
          question: question.question_text || '',
          options: question.options || [],
          correctIndex: question.correct_index ?? 0,
          difficulty: question.difficulty || difficulty,
          explanation: question.explanation || '',
          ...(userAnswerValue !== undefined && { user_answer: userAnswerValue }),
          ...(timeTaken !== undefined && { time_taken: timeTaken }),
        };
      });

      // Insert into quiz_history
      const { error: historyError } = await supabase
        .from('quiz_history')
        .insert({
          user_id: session.user.id,
          topic: topic,
          score: correctCount,
          total_questions: total,
          quiz_data: quizData,
          difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1), // Capitalize first letter
        });

      if (historyError) {
        console.error('Error saving quiz history:', historyError);
        logger.error('Failed to save quiz history', historyError);
        // Don't block UI, just log the error
      } else {
        logger.info('Quiz history saved successfully', {
          topic,
          score: correctCount,
          totalQuestions: total,
          attemptId: params.attemptId,
        });
      }

      setIsSaved(true);
      Alert.alert('Progress Saved!', `+${coins} Coins`, [{ text: 'OK' }]);
      logger.info('Progress saved successfully', {
        coinsEarned: coins,
        xpEarned: xp,
        attemptId: params.attemptId,
      });
    } catch (err) {
      console.error('Unexpected error saving progress:', err);
      logger.error('Failed to save progress', err);
    }
  };

  // Mark questions as seen when the result screen loads
  useEffect(() => {
    const markQuestionsAsSeen = async () => {
      if (!attemptData?.generated_quizzes?.questions || !session?.user) {
        return;
      }

      const questions = attemptData.generated_quizzes.questions;
      
      // Filter questions to only include those with valid UUID ids
      // UUIDs are strings with format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
      const validQuestions = questions.filter((q) => {
        return q.id && 
               typeof q.id === 'string' && 
               q.id.length === 36 && 
               /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.id);
      });

      if (validQuestions.length === 0) {
        return;
      }

      // Prepare array of objects for upsert
      const seenData = validQuestions.map((q) => ({
        user_id: session.user.id,
        question_id: q.id,
      }));

      try {
        const { error: upsertError } = await supabase
          .from('user_seen_questions')
          .upsert(seenData, { ignoreDuplicates: true });

        if (upsertError) {
          console.error('Error marking questions as seen:', upsertError);
          logger.error('Failed to mark questions as seen', upsertError);
        } else {
          logger.info('Questions marked as seen', {
            count: seenData.length,
            attemptId: params.attemptId,
          });
        }
      } catch (err) {
        console.error('Unexpected error marking questions as seen:', err);
        logger.error('Failed to mark questions as seen', err);
      }
    };

    markQuestionsAsSeen();
  }, [attemptData, session?.user?.id, params.attemptId]);

  const handleBackToHome = () => {
    logger.userAction('Back to Home', {}, {});
    router.replace('/(protected)/dashboard');
  };

  const handleReviewSolutions = () => {
    logger.userAction('Review Solutions', {}, {});
    router.push(`/(protected)/quiz/review/${params.attemptId}`);
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
          onPress={handleBackToHome}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
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
          {/* Big, bold display of percentage */}
          <Text style={styles.scoreDisplay}>
            {Math.round(percentage)}%
          </Text>

          {/* Score / Total */}
          <Text style={styles.scoreSubtext}>
            {attemptData.score} / {attemptData.total_questions} correct
          </Text>

          {/* Message */}
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
        </View>

        {/* Analytics Row */}
        <View style={styles.analyticsRow}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsIcon}>⏱️</Text>
            <Text style={styles.analyticsText}>Avg Speed: {avgTimePerQuestion}s</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsIcon}>❌</Text>
            <Text style={styles.analyticsText}>Mistakes Saved: {incorrectCount}</Text>
          </View>
        </View>

        {/* Rewards Card */}
        <View style={styles.rewardsCard}>
          <Text style={styles.rewardsTitle}>Rewards</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardIcon}>🪙</Text>
            <Text style={styles.rewardText}>+{coinsEarned} Coins</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardIcon}>⚡</Text>
            <Text style={styles.rewardText}>+{xpEarned} XP</Text>
          </View>
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
            onPress={handleReviewSolutions}
          >
            <Text style={styles.buttonSecondaryText}>Review Solutions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleBackToHome}
          >
            <Text style={styles.buttonText}>Back to Home</Text>
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
    marginBottom: 8,
  },
  scoreSubtext: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  rewardsCard: {
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
  rewardsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  rewardIcon: {
    fontSize: 24,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
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
  analyticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyticsIcon: {
    fontSize: 20,
  },
  analyticsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});

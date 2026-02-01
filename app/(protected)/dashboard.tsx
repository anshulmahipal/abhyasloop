import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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

interface DashboardStats {
  totalQuizzes: number;
  averageScore: number;
  bestStreak: number;
}

function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonStatsRow}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonActivityItem} />
      <View style={styles.skeletonActivityItem} />
      <View style={styles.skeletonActivityItem} />
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export default function DashboardPage() {
  const { profile, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState<QuizAttemptWithQuiz[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    averageScore: 0,
    bestStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserActivity = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch last 5 quiz attempts with joined quiz data
        const { data, error: fetchError } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            generated_quizzes (
              topic,
              difficulty
            )
          `)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(5);

        if (fetchError) {
          console.error('Error fetching quiz attempts:', fetchError);
          throw new Error('Failed to load your activity');
        }

        setAttempts((data || []) as QuizAttemptWithQuiz[]);

        // Calculate stats from all attempts (not just the 5 shown)
        const { data: allAttempts, error: statsError } = await supabase
          .from('quiz_attempts')
          .select('score, total_questions')
          .eq('user_id', user.id);

        if (!statsError && allAttempts && allAttempts.length > 0) {
          const totalQuizzes = allAttempts.length;
          const totalScore = allAttempts.reduce((sum, attempt) => {
            const percentage = (attempt.score / attempt.total_questions) * 100;
            return sum + percentage;
          }, 0);
          const averageScore = Math.round(totalScore / totalQuizzes);

          setStats({
            totalQuizzes,
            averageScore,
            bestStreak: profile?.current_streak || 0, // Use profile streak for now
          });
        } else {
          setStats({
            totalQuizzes: 0,
            averageScore: 0,
            bestStreak: profile?.current_streak || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch user activity:', err);
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchUserActivity();
    }
  }, [user, authLoading, profile?.current_streak]);

  const handleViewResult = (attemptId: string) => {
    router.push(`/(protected)/result?attemptId=${attemptId}`);
  };

  // Show loading only if we don't have a user yet
  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no user after loading completes, this shouldn't happen (redirect should handle it)
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to continue</Text>
      </View>
    );
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome, {displayName}!</Text>

        {/* Start New Quiz Button */}
        <Link href="/(protected)/quiz/config" style={styles.newQuizButton}>
          <Text style={styles.newQuizButtonText}>Start New Quiz</Text>
        </Link>

        {isLoading ? (
          <SkeletonLoader />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : (
          <>
            {/* Stats Row */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalQuizzes}</Text>
                <Text style={styles.statLabel}>Total Quizzes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.averageScore}%</Text>
                <Text style={styles.statLabel}>Average Score</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>

            {/* Recent Activity */}
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {attempts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No quizzes completed yet</Text>
                <Text style={styles.emptyStateSubtext}>Start your first quiz to see your activity here!</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {attempts.map((attempt) => (
                  <View key={attempt.id} style={styles.activityItem}>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTopic}>
                        {attempt.generated_quizzes?.topic || 'Unknown Topic'}
                      </Text>
                      <Text style={styles.activityScore}>
                        {attempt.score} / {attempt.total_questions}
                      </Text>
                      <Text style={styles.activityDate}>
                        {formatDate(attempt.completed_at)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => handleViewResult(attempt.id)}
                    >
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
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
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  newQuizButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  newQuizButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
    marginBottom: 32,
  },
  activityItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTopic: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  activityScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  skeletonContainer: {
    gap: 16,
  },
  skeletonHeader: {
    height: 32,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  skeletonCard: {
    flex: 1,
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  skeletonTitle: {
    height: 24,
    width: 150,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonActivityItem: {
    height: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 12,
  },
});

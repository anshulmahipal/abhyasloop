import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Platform, Modal, Alert, Animated } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { GoalSelector } from '../../components/GoalSelector';

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
  // Data Fetching: Profile is fetched automatically by AuthContext on mount
  // AuthContext fetches from Supabase profiles table and provides:
  // - profile.target_exams (array of strings)
  // - profile.current_focus (string)
  const { profile, loading: authLoading, user, refreshProfile } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState<QuizAttemptWithQuiz[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    averageScore: 0,
    bestStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUpdatingFocus, setIsUpdatingFocus] = useState(false);
  
  // Optimistic state for UI updates - initialize with null, will be set in useEffect
  const [optimisticFocus, setOptimisticFocus] = useState<string | null>(null);

  // Handling Empty States:
  // Default target_exams if empty/null for testing
  const DEFAULT_EXAMS = ['General Knowledge', 'SSC CGL', 'Banking', 'UPSC'];
  
  // Extract target_exams from profile, default to hardcoded list if null/empty
  const targetExams = (profile?.target_exams && profile.target_exams.length > 0) 
    ? profile.target_exams 
    : DEFAULT_EXAMS;
  
  // Extract current_focus from profile, default to first item in targetExams if null
  const defaultFocus = targetExams[0] || null;
  const currentFocus = profile?.current_focus || defaultFocus;
  
  // Update optimistic state when profile changes
  useEffect(() => {
    const focus = profile?.current_focus || defaultFocus;
    setOptimisticFocus(focus);
  }, [profile?.current_focus, defaultFocus]);

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
          bestStreak: profile?.current_streak || 0,
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

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserActivity();
    }
  }, [user, authLoading, profile?.current_streak]);

  // Set default focus if current_focus is null and we have target exams
  useEffect(() => {
    const setDefaultFocus = async () => {
      if (!user || !profile || profile.current_focus !== null) return;
      
      const firstExam = targetExams[0];
      if (!firstExam) return;

      try {
        await supabase
          .from('profiles')
          .update({ current_focus: firstExam })
          .eq('id', user.id);
        
        await refreshProfile();
      } catch (err) {
        console.error('Failed to set default focus:', err);
      }
    };

    if (profile && user) {
      setDefaultFocus();
    }
  }, [profile, user, targetExams, refreshProfile]);

  const handleViewResult = (attemptId: string) => {
    router.push(`/(protected)/result?attemptId=${attemptId}`);
  };

  const handleFocusChange = async (newFocus: string) => {
    if (!user || isUpdatingFocus || newFocus === optimisticFocus) return;

    // Optimistic Update: Update local state immediately
    setOptimisticFocus(newFocus);
    setShowDropdown(false);

    try {
      setIsUpdatingFocus(true);
      
      // DB Update: Send new value to Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ current_focus: newFocus })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating current_focus:', updateError);
        // Revert optimistic update on error
        setOptimisticFocus(currentFocus);
        Alert.alert('Error', 'Failed to update focus. Please try again.');
        return;
      }

      // Toast/Alert: Show subtle message
      Alert.alert('Focus Updated', `Focus switched to ${newFocus}`, [{ text: 'OK' }]);

      // Refresh profile data from AuthContext
      await refreshProfile();
      
      // Refresh stats and activity to reflect new context
      await fetchUserActivity();
    } catch (err) {
      console.error('Failed to update focus:', err);
      // Revert optimistic update on error
      setOptimisticFocus(currentFocus);
      Alert.alert('Error', 'Failed to update focus. Please try again.');
    } finally {
      setIsUpdatingFocus(false);
    }
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
  const hasTargetExams = targetExams.length > 0;

  // Pulse animation for streak icon when streak > 3
  const streak = profile?.current_streak || 0;
  const shouldPulse = streak > 3;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (shouldPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      // Reset animation when streak <= 3
      pulseAnim.setValue(1);
    }
  }, [shouldPulse, pulseAnim]);

  const renderExamFocusSwitcher = () => {
    const displayFocus = optimisticFocus || defaultFocus || 'Select an exam';

    return (
      <View style={styles.focusBarContainer}>
        {/* Left Side: Label */}
        <Text style={styles.focusBarLabel}>Preparing for:</Text>
        
        {/* Right Side: Dropdown/Picker */}
        {Platform.OS === 'web' ? (
          <View style={styles.focusBarDropdownWeb}>
            <select
              value={displayFocus}
              onChange={(e) => {
                if (e.target.value && e.target.value !== displayFocus) {
                  handleFocusChange(e.target.value);
                }
              }}
              disabled={isUpdatingFocus}
              style={{
                padding: '10px 16px',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '20px',
                border: '1px solid rgba(0, 122, 255, 0.2)',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                color: '#007AFF',
                cursor: isUpdatingFocus ? 'not-allowed' : 'pointer',
                outline: 'none',
                minWidth: '180px',
              }}
            >
              {targetExams.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.focusBarPill}
              onPress={() => setShowDropdown(true)}
              disabled={isUpdatingFocus}
            >
              <Text style={styles.focusBarValue}>{displayFocus}</Text>
              <Text style={styles.focusBarArrow}>▼</Text>
            </TouchableOpacity>
            <Modal
              visible={showDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDropdown(false)}
              >
                <View style={styles.modalContent}>
                  {targetExams.map((exam) => {
                    const isSelected = optimisticFocus === exam;
                    return (
                      <TouchableOpacity
                        key={exam}
                        style={[
                          styles.dropdownOption,
                          isSelected && styles.dropdownOptionSelected,
                        ]}
                        onPress={() => {
                          handleFocusChange(exam);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            isSelected && styles.dropdownOptionTextSelected,
                          ]}
                        >
                          {exam}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableOpacity>
            </Modal>
          </>
        )}
      </View>
    );
  };

  const renderGamificationStats = () => {
    const coins = profile?.coins || 0;

    return (
      <View style={styles.gamificationContainer}>
        {/* Streak */}
        <View style={styles.gamificationItem}>
          <Animated.Text
            style={[
              styles.gamificationIcon,
              styles.streakIcon,
              shouldPulse && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            🔥
          </Animated.Text>
          <Text style={styles.gamificationValue}>{streak}</Text>
        </View>

        {/* Coins */}
        <View style={styles.gamificationItem}>
          <Text style={[styles.gamificationIcon, styles.coinsIcon]}>🪙</Text>
          <Text style={styles.gamificationValue}>{coins}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Exam Focus Switcher - Header Section */}
        {renderExamFocusSwitcher()}
        
        {/* Show GoalSelector if user has no target exams set in profile */}
        {(!profile?.target_exams || profile.target_exams.length === 0) && (
          <GoalSelector
            onSave={(selectedExams) => {
              // Refresh after saving goals
              if (selectedExams.length > 0) {
                setShowDropdown(false);
              }
            }}
          />
        )}
        
        {/* Header with Welcome and Gamification Stats */}
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Welcome, {displayName}!</Text>
          {renderGamificationStats()}
        </View>

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    minWidth: 200,
  },
  gamificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  gamificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gamificationIcon: {
    fontSize: 24,
  },
  streakIcon: {
    color: '#FF6B35',
  },
  coinsIcon: {
    color: '#FFD700',
  },
  gamificationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
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
  focusBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  focusBarLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 12,
  },
  focusBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    minWidth: 180,
  },
  focusBarValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 8,
    flex: 1,
  },
  focusBarArrow: {
    fontSize: 10,
    color: '#007AFF',
    opacity: 0.7,
  },
  focusBarDropdownWeb: {
    flex: 1,
    maxWidth: 250,
  },
  addGoalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  addGoalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    minWidth: 250,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionSelected: {
    backgroundColor: '#007AFF',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dropdownOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

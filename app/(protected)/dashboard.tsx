import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Platform, Modal, Alert, Animated, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { GoalSelector } from '../../components/GoalSelector';
import { MockTestInfoCard } from '../../components/MockTestInfoCard';
import { syncPendingMistakes } from '../../lib/mistakeSync';
import { posthog } from '../../lib/posthog';

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
  const [mistakesCount, setMistakesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUpdatingFocus, setIsUpdatingFocus] = useState(false);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [quote, setQuote] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  
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

  // Fetch daily wisdom quote
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch('https://api.quotable.io/random?tags=technology,wisdom');
        if (response.ok) {
          const data = await response.json();
          setQuote(data.content);
          setAuthor(data.author);
        } else {
          throw new Error('Failed to fetch quote');
        }
      } catch (err) {
        // Fallback to default quote
        setQuote('The expert in anything was once a beginner.');
        setAuthor('');
      }
    };

    fetchQuote();
  }, []);

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

      // Fetch mistakes count
      const { count: mistakesCount, error: mistakesError } = await supabase
        .from('mistakes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!mistakesError && mistakesCount !== null) {
        setMistakesCount(mistakesCount);
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

  // Background sync: Sync pending mistakes on mount
  // This ensures that if a user was offline yesterday, their data uploads the moment they open the app today
  useEffect(() => {
    if (!authLoading && user) {
      syncPendingMistakes().catch((err) => {
        // Errors are already handled inside syncPendingMistakes
        console.error('Unexpected error syncing mistakes on dashboard mount:', err);
      });
    }
  }, [authLoading, user]);

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

      // Track focus changed event
      posthog.capture('focus_changed', {
        previous_focus: currentFocus,
        new_focus: newFocus,
      });

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

  const handleGoalSave = async (newExams: string[]) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to save your goals.');
      return;
    }

    try {
      // Determine new current_focus
      // If current_focus is NOT in the new list, switch to first item
      const currentFocusValue = profile?.current_focus || null;
      const newFocus = newExams.length > 0 
        ? (newExams.includes(currentFocusValue || '') ? currentFocusValue : newExams[0])
        : null;

      // Update Supabase
      const updateData: { target_exams: string[]; current_focus?: string | null } = {
        target_exams: newExams,
      };
      
      if (newFocus !== currentFocusValue) {
        updateData.current_focus = newFocus;
        // Optimistically update focus if it changed
        setOptimisticFocus(newFocus);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        console.error('Error saving target_exams:', updateError);
        Alert.alert('Error', 'Failed to save goals. Please try again.');
        // Revert optimistic update on error
        if (newFocus !== currentFocusValue) {
          setOptimisticFocus(currentFocus);
        }
        return;
      }

      // Refresh profile data from AuthContext
      await refreshProfile();
      
      // Refresh stats and activity to reflect new context
      await fetchUserActivity();

      // Track goals updated event
      posthog.capture('goals_updated', {
        target_exams: newExams,
        exam_count: newExams.length,
      });

      Alert.alert('Success', 'Your goals have been saved!');
    } catch (err) {
      console.error('Failed to save goals:', err);
      Alert.alert('Error', 'Failed to save goals. Please try again.');
      // Revert optimistic update on error
      setOptimisticFocus(currentFocus);
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
  const streak = profile?.current_streak || 0;
  const coins = profile?.coins || 0;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderExamFocusSwitcher = () => {
    const displayFocus = optimisticFocus || defaultFocus || 'Select an exam';

    return (
      <View style={styles.focusBarContainer}>
        {/* Left Side: Label */}
        <Text style={styles.focusBarLabel}>Preparing for:</Text>
        
        {/* Right Side: Dropdown/Picker + Edit Icon */}
        <View style={styles.focusBarRight}>
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
                  border: '1px solid #a7f3d0',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
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
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setShowDropdown(false)}
                >
                  <Pressable
                    style={styles.modalContent}
                    onPress={(e) => e.stopPropagation()}
                  >
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
                  </Pressable>
                </Pressable>
              </Modal>
            </>
          )}
            <TouchableOpacity
            style={styles.editIconButton}
            onPress={() => setIsGoalModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={18} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const renderHeader = () => {
    return (
      <View style={styles.headerSection}>
        <Text style={styles.headerGreeting}>
          {getGreeting()}, {displayName}!
        </Text>
        <Text style={styles.headerSubtext}>Ready to learn something new?</Text>
      </View>
    );
  };

  const renderWeeklyMockCard = () => {
    return (
      <TouchableOpacity
        style={styles.weeklyMockCard}
        onPress={() => {
          // Track weekly mock clicked event
          posthog.capture('weekly_mock_clicked');
          router.push('/(protected)/quiz/config?mode=weekly');
        }}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#2C3E50', '#34495E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weeklyMockGradient}
        >
          <View style={[styles.weeklyMockContent, isMobile && styles.weeklyMockContentMobile]}>
            <View style={styles.weeklyMockLeft}>
              <View style={styles.weeklyMockIconContainer}>
                <Text style={styles.weeklyMockIcon}>🏆</Text>
              </View>
              <View style={styles.weeklyMockTextContainer}>
                <Text style={styles.weeklyMockTitle}>All India Weekly Mock</Text>
                <Text style={styles.weeklyMockSubtitle}>Live Now • Ends in 12h</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.weeklyMockButton, isMobile && styles.weeklyMockButtonMobile]}
              onPress={() => router.push('/(protected)/quiz/config?mode=weekly')}
              activeOpacity={0.8}
            >
              <Text style={styles.weeklyMockButtonText}>Enter Arena</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeroWidgets = () => {
    return (
      <View style={styles.heroWidgetsRow}>
        {/* Streak Card */}
        <TouchableOpacity style={styles.heroWidgetCard} activeOpacity={0.9}>
          <View style={styles.heroWidgetInner}>
            <View style={styles.heroWidgetIconWrap}>
              <Text style={styles.heroWidgetIcon}>🔥</Text>
            </View>
            <Text style={styles.heroWidgetTitle}>Day Streak</Text>
            <Text style={styles.heroWidgetValue}>{streak}</Text>
          </View>
        </TouchableOpacity>

        {/* Mistakes Card */}
        <TouchableOpacity 
          style={styles.heroWidgetCard} 
          activeOpacity={0.9}
          onPress={() => router.push('/(protected)/quiz/mistakes')}
        >
          <View style={styles.heroWidgetInner}>
            <View style={styles.heroWidgetIconWrap}>
              <Text style={styles.heroWidgetIcon}>🧠</Text>
            </View>
            <Text style={styles.heroWidgetTitle}>Mistakes</Text>
            <Text style={styles.heroWidgetValue}>{mistakesCount}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPerformanceSection = () => {
    return (
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.performanceRow}>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceValue}>{stats.totalQuizzes}</Text>
            <Text style={styles.performanceLabel}>Total Quizzes</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceValue}>{stats.averageScore}%</Text>
            <Text style={styles.performanceLabel}>Avg Accuracy</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceValue}>{coins.toLocaleString()}</Text>
            <Text style={styles.performanceLabel}>Coins Earned</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDailyWisdom = () => {
    return (
      <View style={styles.wisdomCard}>
        <Text style={styles.wisdomText}>
          "{quote || 'The expert in anything was once a beginner.'}"
        </Text>
        {author && (
          <Text style={styles.wisdomAuthor}>— {author}</Text>
        )}
      </View>
    );
  };



  const handleLogout = async () => {
    console.log('Logout button pressed'); // Debug log

    // Web-specific confirmation
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (!confirmed) {
        return;
      }

      try {
        console.log('Signing out...'); // Debug log
        // Track user logged out event
        posthog.capture('user_logged_out');
        posthog.reset();
        await supabase.auth.signOut();
        // The _layout.tsx session listener will automatically redirect to Login
      } catch (error) {
        console.error('Error signing out:', error);
        window.alert('Failed to log out. Please try again.');
      }
      return;
    }

    // Native platforms use Alert
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Signing out...'); // Debug log
              // Track user logged out event
              posthog.capture('user_logged_out');
              posthog.reset();
              await supabase.auth.signOut();
              // The _layout.tsx session listener will automatically redirect to Login
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.mainContainer}>
        {/* ScrollView - Foreground Layer */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWrapper, isMobile && styles.contentWrapperMobile]}>
            {/* Header Section */}
            {renderHeader()}

            {/* Weekly Live Mock Card */}
            {renderWeeklyMockCard()}

            {/* Hero Widgets */}
            {renderHeroWidgets()}

            {/* Performance Section */}
            {renderPerformanceSection()}

            {/* Recent Activity */}
            <TouchableOpacity
              onPress={() => router.push('/(protected)/history')}
              activeOpacity={0.7}
              style={styles.sectionTitleContainer}
            >
              <Text style={styles.sectionTitle}>Recent History</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            {isLoading ? (
              <SkeletonLoader />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : attempts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No quizzes completed yet</Text>
                <Text style={styles.emptyStateSubtext}>Start your first quiz to see your activity here!</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {attempts.map((attempt) => {
                  const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  return (
                    <MockTestInfoCard
                      key={attempt.id}
                      title={attempt.generated_quizzes?.topic || 'Unknown Topic'}
                      score={attempt.score}
                      total={attempt.total_questions}
                      date={dateStr}
                      onPress={() => router.push(`/(protected)/quiz/review/${attempt.id}`)}
                    />
                  );
                })}
              </View>
            )}

            {/* Daily Wisdom Card */}
            {renderDailyWisdom()}
          </View>
        </ScrollView>

        {/* Goal Selector Modal */}
        <GoalSelector
          visible={isGoalModalVisible}
          onClose={() => setIsGoalModalVisible(false)}
          initialSelection={targetExams}
          onSave={handleGoalSave}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100, // Extra padding for tab bar (no floating button anymore)
    alignItems: 'center',
    minHeight: '100%',
  },
  contentWrapper: {
    width: '90%',
    maxWidth: 500,
    paddingHorizontal: 20,
  },
  contentWrapperMobile: {
    width: '100%',
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  // Header Section
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Hero Widgets
  heroWidgetsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  heroWidgetCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroWidgetInner: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  heroWidgetIconWrap: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  heroWidgetIcon: {
    fontSize: 32,
  },
  heroWidgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  heroWidgetValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  // Performance Section
  performanceSection: {
    marginBottom: 32,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  performanceRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Daily Wisdom
  wisdomCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  wisdomText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  wisdomAuthor: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'normal',
  },
  activityList: {
    gap: 12,
    marginBottom: 32,
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
  focusBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ecfdf5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    minWidth: 180,
  },
  editIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  focusBarValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    marginRight: 8,
    flex: 1,
  },
  focusBarArrow: {
    fontSize: 10,
    color: '#059669',
    opacity: 0.7,
  },
  focusBarDropdownWeb: {
    flex: 1,
    maxWidth: 250,
  },
  addGoalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#059669',
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
    backgroundColor: '#059669',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dropdownOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  weeklyMockCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  weeklyMockGradient: {
    padding: 20,
    borderRadius: 16,
  },
  weeklyMockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyMockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weeklyMockIconContainer: {
    marginRight: 16,
  },
  weeklyMockIcon: {
    fontSize: 32,
  },
  weeklyMockTextContainer: {
    flex: 1,
  },
  weeklyMockTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  weeklyMockSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E8E8E8',
  },
  weeklyMockButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginLeft: 16,
  },
  weeklyMockButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  weeklyMockContentMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  weeklyMockButtonMobile: {
    width: '100%',
    marginLeft: 0,
    alignItems: 'center',
  },
});

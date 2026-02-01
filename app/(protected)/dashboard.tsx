import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Platform, Modal, Alert, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  const [buttonScale] = useState(new Animated.Value(1));
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  
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
            <Ionicons name="pencil" size={18} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeroSection = () => {
    const coins = profile?.coins || 0;
    const currentStreak = profile?.current_streak || 0;
    const nextMilestone = 7; // 7-day milestone
    const streakProgress = Math.min((currentStreak / nextMilestone) * 100, 100);

    return (
      <View style={styles.heroCard}>
        {/* Top Row: Hello + Profile Pic */}
        <View style={styles.heroTopRow}>
          <Text style={styles.heroGreeting}>Hello, {displayName}</Text>
          {profile?.avatar_url ? (
            <View style={styles.profilePicContainer}>
              <Text style={styles.profilePicText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.profilePicContainer}>
              <Ionicons name="person" size={24} color="#007AFF" />
            </View>
          )}
        </View>

        {/* Middle: Focus Pill */}
        <View style={styles.heroFocusPill}>
          <Text style={styles.heroFocusText}>Focus: {optimisticFocus || currentFocus || 'General Knowledge'}</Text>
        </View>

        {/* Bottom Row: Streak with Progress */}
        <View style={styles.heroStreakSection}>
          <View style={styles.heroStreakRow}>
            <Animated.Text
              style={[
                styles.heroStreakIcon,
                shouldPulse && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              🔥
            </Animated.Text>
            <Text style={styles.heroStreakText}>
              {currentStreak} Day Streak
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill,
                  { width: `${streakProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressBarText}>
              {currentStreak}/{nextMilestone} days
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatCard = (icon: string, value: string | number, label: string, iconName?: keyof typeof Ionicons.glyphMap) => {
    return (
      <View style={styles.statCard}>
        <View style={styles.statIconContainer}>
          {iconName ? (
            <Ionicons name={iconName} size={24} color="#007AFF" />
          ) : (
            <Text style={styles.statIcon}>{icon}</Text>
          )}
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  };

  const coins = profile?.coins || 0;
  const mistakesPending = 0; // Mock count

  const handleButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage > 80) return '#4CAF50'; // Green
    if (percentage < 50) return '#F44336'; // Red
    return '#FF9800'; // Orange
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
    <View style={styles.mainContainer}>
      {/* Header - Background Layer */}
      <LinearGradient
        colors={['#6a11cb', '#2575fc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>New Mission</Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-out-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={styles.targetingPill}>
            <Text style={styles.targetingPillText}>
              Targeting: {optimisticFocus || currentFocus || 'General Knowledge'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ScrollView - Foreground Layer */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Hero Section */}
          {renderHeroSection()}

          {/* Exam Focus Switcher */}
          {renderExamFocusSwitcher()}

          {/* Stats Grid - 2 columns */}
          <View style={styles.statsGrid}>
            {renderStatCard('🪙', coins, 'Coins', 'wallet')}
            {renderStatCard('🎯', `${stats.averageScore}%`, 'Average Score', 'trophy')}
            {renderStatCard('📊', stats.totalQuizzes, 'Total Quizzes', 'document-text')}
            {renderStatCard('⚠️', mistakesPending, 'Mistakes Pending', 'alert-circle')}
          </View>

          {/* Recent Activity */}
          <Text style={styles.sectionTitle}>Recent History</Text>
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
                const percentage = (attempt.score / attempt.total_questions) * 100;
                const scoreColor = getScoreColor(attempt.score, attempt.total_questions);
                
                return (
                  <View key={attempt.id} style={styles.activityItem}>
                    <View style={[styles.activityDot, { backgroundColor: scoreColor }]} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTopic}>
                        {attempt.generated_quizzes?.topic || 'Unknown Topic'}
                      </Text>
                      <Text style={styles.activityDate}>
                        {formatDate(attempt.completed_at)}
                      </Text>
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                      <Text style={styles.scoreBadgeText}>
                        {attempt.score}/{attempt.total_questions}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button - Fixed Footer */}
      <Link href="/(protected)/quiz/config" asChild>
        <Pressable
          onPress={handleButtonPress}
          style={({ pressed }) => [
            styles.floatingButton,
            {
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          {({ pressed }) => (
            <Animated.View
              style={[
                styles.floatingButtonInner,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.floatingButtonGradient}
              >
                <Text style={styles.floatingButtonText}>Start New Quiz</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </Animated.View>
          )}
        </Pressable>
      </Link>

      {/* Goal Selector Modal */}
      <GoalSelector
        visible={isGoalModalVisible}
        onClose={() => setIsGoalModalVisible(false)}
        initialSelection={targetExams}
        onSave={handleGoalSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  // Header - Background Layer
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 1,
  },
  headerContent: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 2,
  },
  targetingPill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  targetingPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 180,
    paddingBottom: 120,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '90%',
    maxWidth: 500,
  },
  container: {
    flex: 1,
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  // Hero Section
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  profilePicContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  heroFocusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  heroFocusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  heroStreakSection: {
    width: '100%',
  },
  heroStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroStreakIcon: {
    fontSize: 32,
    marginRight: 8,
  },
  heroStreakText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  progressBarText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: 'space-between',
  },
  statIconContainer: {
    alignSelf: 'flex-start',
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 'auto',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  activityList: {
    gap: 10,
    marginBottom: 32,
  },
  activityItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
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
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  scoreBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  scoreBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Floating Action Button - Fixed Footer
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    left: '5%',
    right: '5%',
    width: '90%',
    maxWidth: 500,
    alignSelf: 'center',
    zIndex: 10,
  },
  floatingButtonInner: {
    width: '100%',
  },
  floatingButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  floatingButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    minWidth: 180,
  },
  editIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
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

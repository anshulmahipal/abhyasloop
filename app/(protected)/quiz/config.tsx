import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { generateQuiz } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { useExamConfig } from '../../../hooks/useExamConfig';
import { MockTestInfoCard } from '../../../components/MockTestInfoCard';
import { posthog } from '../../../lib/posthog';

type TabType = 'recent' | 'goals';

interface RecentTopic {
  id: string;
  name: string;
}

interface RecentQuiz {
  id: string;
  topic: string;
  score: number;
  total_questions: number;
  difficulty: string;
  created_at: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  topics: string[];
}

// Static categories fallback (kept for reference, but will be replaced by dynamic data)
const CATEGORIES: Category[] = [
  {
    id: 'math',
    title: 'Mathematics',
    icon: 'calculator',
    topics: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
  },
  {
    id: 'science',
    title: 'Science',
    icon: 'flask',
    topics: ['Physics', 'Chemistry', 'Biology', 'Astronomy', 'Earth Science'],
  },
  {
    id: 'history',
    title: 'History',
    icon: 'book',
    topics: ['World History', 'Ancient History', 'Modern History', 'US History', 'European History'],
  },
  {
    id: 'tech',
    title: 'Tech',
    icon: 'laptop',
    topics: ['Programming', 'Web Development', 'Data Science', 'AI/ML', 'Cybersecurity'],
  },
];

const DIFFICULTY_LEVELS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS = {
  easy: '🟢 Easy',
  medium: '🟡 Medium',
  hard: '🔥 Hard',
};

const QUESTION_COUNTS = ['5', '10', '15', '20'];

// Mock recent topics - replace with actual data later
const MOCK_RECENT_TOPICS: RecentTopic[] = [
  { id: '1', name: 'Algebra' },
  { id: '2', name: 'Physics' },
];

interface CommunitySet {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  last_active: string;
}

// Utility function to format relative time
const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

// Get icon based on topic
const getTopicIcon = (topic: string): string => {
  const topicLower = topic.toLowerCase();
  if (topicLower.includes('bank') || topicLower.includes('finance')) return 'card';
  if (topicLower.includes('analytics') || topicLower.includes('data')) return 'analytics';
  if (topicLower.includes('math') || topicLower.includes('algebra')) return 'calculator';
  if (topicLower.includes('science') || topicLower.includes('physics')) return 'flask';
  if (topicLower.includes('history')) return 'book';
  if (topicLower.includes('tech') || topicLower.includes('programming')) return 'laptop';
  return 'layers-outline';
};

export default function QuizConfigPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { exams, loading } = useExamConfig();
  
  // Tab state - default to Goals when opened with ?tab=goals (e.g. from dashboard)
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    params.tab === 'goals' ? 'goals' : 'recent'
  );

  // Sync tab when param changes (e.g. deep link with tab=goals)
  useEffect(() => {
    if (params.tab === 'goals') setActiveTab('goals');
  }, [params.tab]);
  
  // Recent quizzes state
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const currentFocus = profile?.current_focus || 'General Knowledge';

  // Fetch recent quizzes from quiz_history table
  const fetchRecentQuizzes = useCallback(async () => {
    if (!user) {
      setLoadingRecent(false);
      return;
    }

    try {
      setLoadingRecent(true);
      const { data, error } = await supabase
        .from('quiz_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent quizzes:', error);
        return;
      }

      setRecentQuizzes((data || []) as RecentQuiz[]);
    } catch (err) {
      console.error('Failed to fetch recent quizzes:', err);
    } finally {
      setLoadingRecent(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentQuizzes();
  }, [fetchRecentQuizzes]);

  // Refetch recent when user returns to this screen (e.g. after completing a test)
  useFocusEffect(
    useCallback(() => {
      fetchRecentQuizzes();
    }, [fetchRecentQuizzes])
  );

  const handleCategoryPress = (category: Category) => {
    const title = (category as any).title || (category as any).name || 'Mock Test';
    const topicsList = (category as any).topics ?? category.topics ?? [];
    router.push({
      pathname: '/(protected)/quiz/configure',
      params: {
        title,
        topics: JSON.stringify(Array.isArray(topicsList) ? topicsList : []),
        id: category.id,
      },
    });
  };

  const goToConfigureForGoal = (examName: string) => {
    const item = (exams as Category[]).find(
      (e) => ((e as any).title || (e as any).name || '').toLowerCase() === examName.toLowerCase()
    );
    const { id } = getExamConfigForGoal(examName);
    if (item) {
      handleCategoryPress(item as Category);
    } else {
      router.push({
        pathname: '/(protected)/quiz/configure',
        params: {
          title: examName,
          topics: JSON.stringify([examName]),
          id: id || 'goal',
        },
      });
    }
  };

  const handleRecentTopicPress = (topic: RecentTopic) => {
    router.push({
      pathname: '/(protected)/quiz/configure',
      params: {
        title: topic.name,
        topics: JSON.stringify([topic.name]),
        preselectedTopic: topic.name,
      },
    });
  };

  // Handle instant play with topic and difficulty
  const handleInstantPlay = async (topic: string, difficulty: 'easy' | 'medium' | 'hard') => {
    try {
      setIsGenerating(true);

      const response = await generateQuiz(topic, difficulty, currentFocus, 10);

      router.push({
        pathname: '/(protected)/quiz/[id]',
        params: {
          id: response.quizId,
          topic: topic,
          difficulty: difficulty,
          examType: currentFocus,
        },
      });
    } catch (error) {
      console.error('Failed to start instant play:', error);
      // Track quiz generation failed event
      posthog.capture('quiz_generation_failed', {
        topic,
        difficulty,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to start exam. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTabSwitcher = () => (
    <View style={styles.tabSwitcher}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'recent' && styles.tabButtonActive]}
        onPress={() => {
          setActiveTab('recent');
          setError(null); // Clear error when switching tabs
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabButtonText, activeTab === 'recent' && styles.tabButtonTextActive]}>
          Recent
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'goals' && styles.tabButtonActive]}
        onPress={() => {
          setActiveTab('goals');
          setError(null); // Clear error when switching tabs
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabButtonText, activeTab === 'goals' && styles.tabButtonTextActive]}>
          Goals
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGridCard = (title: string, icon: string, onPress: () => void, showResumeIcon = false) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon as any} size={32} color="#059669" />
      <Text style={styles.gridCardTitle}>{title}</Text>
      {showResumeIcon && (
        <Ionicons name="play-circle" size={24} color="#059669" style={styles.resumeIcon} />
      )}
    </TouchableOpacity>
  );

  // Match user's goal names to exam config for icon/id; avoid help icons
  const getExamConfigForGoal = (examName: string) => {
    const match = (exams as Category[]).find(
      (e) =>
        ((e as any).title || (e as any).name || '').toLowerCase() === examName.toLowerCase()
    );
    return match
      ? { icon: (match as any).icon || 'flag', id: (match as any).id }
      : { icon: 'flag', id: examName.replace(/\s+/g, '-').toLowerCase() };
  };

  const renderGoalsSection = () => {
    const targetExams = (profile?.target_exams && profile.target_exams.length > 0)
      ? profile.target_exams
      : [];
    const currentFocusExam = profile?.current_focus || null;
    const hasGoals = targetExams.length > 0;

    if (!hasGoals && !currentFocusExam) return null;

    return (
      <View style={styles.goalsSectionInRecent}>
        <Text style={styles.goalsSectionLabel}>Your goals</Text>
        {currentFocusExam && (
          <View style={styles.currentFocusSection}>
            <TouchableOpacity
              style={styles.focusCard}
              onPress={() => goToConfigureForGoal(currentFocusExam)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={(getExamConfigForGoal(currentFocusExam)?.icon || 'flag') as any}
                size={28}
                color="#059669"
              />
              <Text style={styles.focusCardTitle} numberOfLines={2}>
                {currentFocusExam}
              </Text>
              <Ionicons name="play-circle" size={24} color="#059669" style={styles.focusPlayIcon} />
            </TouchableOpacity>
          </View>
        )}
        {hasGoals && (
          <>
            <View style={styles.gridWrapper}>
              {targetExams.map((examName, index) => {
                const { icon, id } = getExamConfigForGoal(examName);
                const isFocus = examName === currentFocusExam;
                return (
                  <View key={`goal-${id}-${index}`} style={styles.gridItem}>
                    <TouchableOpacity
                      style={[styles.gridCard, isFocus && styles.gridCardFocus]}
                      onPress={() => goToConfigureForGoal(examName)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={icon as any} size={32} color="#059669" />
                      <Text style={styles.gridCardTitle} numberOfLines={2}>
                        {examName}
                      </Text>
                      {isFocus && (
                        <Text style={styles.focusBadge}>Focus</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.editGoalsLink}
              onPress={() => router.push('/(protected)/all-exams')}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={18} color="#059669" />
              <Text style={styles.editGoalsLinkText}>Edit goals</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderRecentView = () => {
    if (loadingRecent) {
      return (
        <View style={styles.recentLoadingContainer}>
          <ActivityIndicator size="small" color="#059669" />
        </View>
      );
    }

    if (recentQuizzes.length === 0) {
      const categoriesToRender = exams.length > 0 ? (exams as Category[]) : CATEGORIES;
      return (
        <View style={styles.emptyRecentContainer}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No recent plays</Text>
            <Text style={styles.emptyStateText}>
              Recent is empty because you haven't attempted any exam yet. Pick an exam below to start.
            </Text>
          </View>
          {renderGoalsSection()}
          <Text style={styles.examsSectionLabel}>Exams</Text>
          <View style={styles.gridWrapper}>
            {categoriesToRender.map((item, index) => {
              const displayTitle = (item as any).title || (item as any).name || 'Unknown';
              const uniqueKey = item.id || `category-${index}`;
              return (
                <View key={uniqueKey} style={styles.gridItem}>
                  {renderGridCard(displayTitle, item.icon as any, () => handleCategoryPress(item as Category))}
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.recentListContainer}>
        {recentQuizzes.map((item) => {
          const difficulty = item.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
          const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return (
            <MockTestInfoCard
              key={item.id}
              title={item.topic}
              score={item.score}
              total={item.total_questions}
              date={formattedDate}
              onPress={() => handleInstantPlay(item.topic, difficulty)}
            />
          );
        })}
        {renderGoalsSection()}
      </View>
    );
  };

  const renderGoalsView = () => {
    const targetExams = (profile?.target_exams && profile.target_exams.length > 0)
      ? profile.target_exams
      : [];
    const currentFocusExam = profile?.current_focus || null;
    const hasGoals = targetExams.length > 0;

    if (!hasGoals) {
      return (
        <View style={styles.emptyRecentContainer}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No goals set</Text>
            <Text style={styles.emptyStateText}>
              Set your target exams so we can show your focus and quick-start options here.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/(protected)/all-exams')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyStateButtonText}>Set goals</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.goalsContainer}>
        {currentFocusExam && (
          <View style={styles.currentFocusSection}>
            <Text style={styles.goalsSectionLabel}>Current focus</Text>
            <TouchableOpacity
              style={styles.focusCard}
              onPress={() => goToConfigureForGoal(currentFocusExam)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={(getExamConfigForGoal(currentFocusExam)?.icon || 'flag') as any}
                size={28}
                color="#059669"
              />
              <Text style={styles.focusCardTitle} numberOfLines={2}>
                {currentFocusExam}
              </Text>
              <Ionicons name="play-circle" size={24} color="#059669" style={styles.focusPlayIcon} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.goalsSectionLabel}>Your target exams</Text>
            <View style={styles.gridWrapper}>
              {targetExams.map((examName, index) => {
                const { icon, id } = getExamConfigForGoal(examName);
                const isFocus = examName === currentFocusExam;
                return (
                  <View key={`goal-${id}-${index}`} style={styles.gridItem}>
                    <TouchableOpacity
                      style={[styles.gridCard, isFocus && styles.gridCardFocus]}
                      onPress={() => goToConfigureForGoal(examName)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={icon as any} size={32} color="#059669" />
                      <Text style={styles.gridCardTitle} numberOfLines={2}>
                        {examName}
                      </Text>
                      {isFocus && (
                        <Text style={styles.focusBadge}>Focus</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.editGoalsLink}
              onPress={() => router.push('/(protected)/all-exams')}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={18} color="#059669" />
          <Text style={styles.editGoalsLinkText}>Edit goals</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Title Bar - no back arrow; Mock Tests is a top-level nav destination */}
      <View style={styles.titleBar}>
        <Text style={styles.titleBarText}>New Exam</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcherContainer}>
        {renderTabSwitcher()}
      </View>

      {/* Content */}
      {loading && exams.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {activeTab === 'recent' ? renderRecentView() : renderGoalsView()}
          </View>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  titleBar: {
    backgroundColor: '#059669',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tabSwitcherContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#059669',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  container: {
    paddingHorizontal: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  gridCard: {
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    textAlign: 'center',
  },
  resumeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  emptyRecentContainer: {
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  examsSectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  goalsSectionInRecent: {
    marginTop: 8,
    marginBottom: 20,
  },
  goalsContainer: {
    paddingBottom: 24,
  },
  currentFocusSection: {
    marginBottom: 20,
  },
  goalsSectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#059669',
    position: 'relative',
  },
  focusCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  focusPlayIcon: {
    marginLeft: 8,
  },
  gridCardFocus: {
    borderWidth: 2,
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  focusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  editGoalsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
  },
  editGoalsLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
  },
  emptyStateButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  recentLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentListContainer: {
    gap: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTopicsSection: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topicCardsContainer: {
    paddingRight: 24,
    gap: 16,
  },
  topicCard: {
    width: 140,
    height: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topicCardMockTest: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  topicCardSelected: {
    borderColor: '#059669',
    borderWidth: 4,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  topicCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  topicCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  topicCardTitleSelected: {
    color: '#059669',
    fontWeight: '700',
  },
  modalSection: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  difficultyToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  difficultySegment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultySegmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  difficultySegmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  difficultySegmentTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  questionCountToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  questionCountSegment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCountSegmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  questionCountSegmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  questionCountSegmentTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  modalFooterInner: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButtonFull: {
    width: '100%',
  },
  pendingModalBody: {
    padding: 24,
    alignItems: 'center',
  },
  pendingModalIcon: {
    marginBottom: 16,
  },
  pendingModalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  pendingModalButtons: {
    width: '100%',
    gap: 12,
  },
  modalStartButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#059669',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalStartButtonFull: {
    width: '100%',
  },
  modalStartButtonNoFlex: {
    flex: 0,
  },
  modalStartButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalStartButtonLoading: {
    opacity: 0.7,
  },
  modalStartButtonLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalStartButtonSpinner: {
    marginRight: 0,
  },
  modalStartButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Community Rescue Modal Styles
  communityModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  communityModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  communityModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    flex: 1,
  },
  communityModalSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  communitySetsScrollView: {
    flex: 1,
  },
  communitySetsContainer: {
    padding: 24,
    gap: 12,
  },
  communityLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityEmptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityEmptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  communityCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  communityCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  communityCardContent: {
    flex: 1,
  },
  communityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  communityCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  communityCardFooter: {
    marginTop: 4,
  },
  communityCardFooterText: {
    fontSize: 13,
    color: '#666',
  },
  communityCardArrow: {
    marginLeft: 12,
  },
  // Error Screen Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
  },
  errorBannerClose: {
    padding: 4,
  },
  // Error Screen Styles
  errorScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  errorIconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  errorScreenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorScreenText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorDetailsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 500,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  errorButtonContainer: {
    width: '100%',
    maxWidth: 500,
    gap: 12,
  },
  errorScreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 56,
  },
  errorScreenButtonPrimary: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorScreenButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#059669',
  },
  errorScreenButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorScreenButtonTextSecondary: {
    color: '#059669',
  },
});

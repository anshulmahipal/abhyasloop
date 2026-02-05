import { useState, useRef, useEffect, Fragment, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { generateMockTest, generateQuiz } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { useExamConfig } from '../../../hooks/useExamConfig';

type TabType = 'recent' | 'explore';

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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { exams, loading } = useExamConfig();
  
  // Tab state - will be updated based on recentQuizzes after fetch
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  
  // Recent quizzes state
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Category | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null | undefined>(undefined); // undefined = nothing selected, null = Mock Test, string = specific topic
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState<string>('10');
  
  // Quiz generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const buttonDisableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Community Rescue modal state
  const [showCommunityRescueModal, setShowCommunityRescueModal] = useState(false);
  const [communitySets, setCommunitySets] = useState<CommunitySet[]>([]);
  const [isLoadingCommunitySets, setIsLoadingCommunitySets] = useState(false);

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

  // Auto-refresh when screen comes into focus or user changes
  useEffect(() => {
    fetchRecentQuizzes();
  }, [fetchRecentQuizzes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (buttonDisableTimeoutRef.current) {
        clearTimeout(buttonDisableTimeoutRef.current);
      }
    };
  }, []);

  const handleCategoryPress = (category: Category) => {
    setSelectedExam(category);
    setSelectedTopic(undefined); // Reset selection - nothing selected initially
    setModalVisible(true);
  };

  const handleRecentTopicPress = (topic: RecentTopic) => {
    // For recent topics, create a temporary category object
    const tempCategory: Category = {
      id: 'recent',
      title: topic.name,
      icon: 'book',
      topics: [topic.name],
    };
    setSelectedExam(tempCategory);
    setSelectedTopic(topic.name);
    setModalVisible(true);
  };

  // Fetch community sets from RPC
  const fetchCommunitySets = async () => {
    try {
      setIsLoadingCommunitySets(true);
      const { data, error } = await supabase.rpc('get_community_sets');

      if (error) {
        console.error('Error fetching community sets:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        setCommunitySets(data as CommunitySet[]);
      }
    } catch (err) {
      console.error('Failed to fetch community sets:', err);
    } finally {
      setIsLoadingCommunitySets(false);
    }
  };

  // Handle instant play with topic and difficulty
  const handleInstantPlay = async (topic: string, difficulty: 'easy' | 'medium' | 'hard') => {
    try {
      setIsGenerating(true);
      setShowCommunityRescueModal(false);

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
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to start quiz. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedExam || selectedTopic === undefined) {
      Alert.alert('Select Option', 'Please select Mock Test or a specific topic to start the quiz.');
      return;
    }

    // Disable button for 2 seconds to prevent double-taps
    setIsButtonDisabled(true);
    if (buttonDisableTimeoutRef.current) {
      clearTimeout(buttonDisableTimeoutRef.current);
    }
    buttonDisableTimeoutRef.current = setTimeout(() => {
      setIsButtonDisabled(false);
      buttonDisableTimeoutRef.current = null;
    }, 2000);

    try {
      setIsGenerating(true);
      setModalVisible(false);
      setShowCommunityRescueModal(false); // Ensure rescue modal is closed when starting
      
      let response;
      let topicForQuiz: string;
      
      // Check if Mock Test was selected (selectedTopic === null)
      if (selectedTopic === null) {
        // Case A: Mock Test
        response = await generateMockTest(
          selectedExam.title,
          selectedExam.topics,
          selectedDifficulty
        );
        topicForQuiz = selectedExam.title; // Use subject title for mock test
      } else {
        // Case B: Specific Topic (Default)
        // Call generate-quiz with subject and topic
        topicForQuiz = selectedTopic;
        const { data, error } = await supabase.functions.invoke('generate-quiz', {
          body: {
            subject: selectedExam.title,
            topic: selectedTopic,
            difficulty: selectedDifficulty.toLowerCase(),
            userFocus: currentFocus.trim(),
            questionCount: parseInt(questionCount, 10),
          },
        });

        if (error) {
          console.error('Supabase function error:', error);
          
          // Check for rate limit
          const isRateLimit = error.status === 429 || 
                             error.message?.includes('Please wait') ||
                             error.message?.includes('active quiz');
          
          // Extract error message
          let errorMessage = 'Failed to generate quiz. Please try again.';
          if (error.message) {
            errorMessage = error.message;
          } else if (error.context?.msg) {
            errorMessage = error.context.msg;
          }
          
          const rateLimitError = new Error(errorMessage);
          (rateLimitError as any).isRateLimit = isRateLimit;
          throw rateLimitError;
        }

        // Validate response structure
        if (!data) {
          throw new Error('No data returned from quiz generation service');
        }

        // Check if response contains an error field
        if (typeof data === 'object' && 'error' in data) {
          const errorData = data as { error: string; details?: string };
          const errorMessage = errorData.details || errorData.error || 'Failed to generate quiz';
          
          const isRateLimit = errorMessage.includes('Please wait') || 
                             errorMessage.includes('active quiz') ||
                             errorMessage.includes('1 minute');
          
          const rateLimitError = new Error(errorMessage);
          (rateLimitError as any).isRateLimit = isRateLimit;
          throw rateLimitError;
        }

        // Validate response format
        if (!data.success || !Array.isArray(data.questions)) {
          throw new Error('Invalid response format from quiz generation service');
        }

        // Validate questions array is not empty
        if (data.questions.length === 0) {
          throw new Error('No questions were generated. Please try again.');
        }

        response = data;
      }
      
      router.push({
        pathname: '/(protected)/quiz/[id]',
        params: {
          id: response.quizId,
          topic: topicForQuiz,
          difficulty: selectedDifficulty,
          examType: currentFocus,
        },
      });
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      
      // Set error message (non-blocking, shown in banner)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to generate quiz. Please try again.';
      setError(errorMessage);
      
      // For ANY generation failure, show Community Rescue modal
      // Stop loading spinner and show the modal
      setIsGenerating(false);
      await fetchCommunitySets();
      setShowCommunityRescueModal(true);
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
        style={[styles.tabButton, activeTab === 'explore' && styles.tabButtonActive]}
        onPress={() => {
          setActiveTab('explore');
          setError(null); // Clear error when switching tabs
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabButtonText, activeTab === 'explore' && styles.tabButtonTextActive]}>
          Explore
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
      <Ionicons name={icon as any} size={32} color="#FF512F" />
      <Text style={styles.gridCardTitle}>{title}</Text>
      {showResumeIcon && (
        <Ionicons name="play-circle" size={24} color="#FF512F" style={styles.resumeIcon} />
      )}
    </TouchableOpacity>
  );

  const renderRecentView = () => {
    if (loadingRecent) {
      return (
        <View style={styles.recentLoadingContainer}>
          <ActivityIndicator size="small" color="#FF512F" />
        </View>
      );
    }

    if (recentQuizzes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No recent plays</Text>
          <Text style={styles.emptyStateText}>Start exploring to build your quiz history!</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setActiveTab('explore')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyStateButtonText}>Find a Topic</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              key={item.id}
              style={styles.recentCard}
              onPress={() => handleInstantPlay(item.topic, difficulty)}
              activeOpacity={0.8}
            >
              <View style={styles.recentCardIcon}>
                <Ionicons 
                  name={getTopicIcon(item.topic) as any} 
                  size={24} 
                  color="#FF512F" 
                />
              </View>
              <View style={styles.recentCardContent}>
                <Text style={styles.recentCardTitle}>{item.topic}</Text>
                <Text style={styles.recentCardSubtitle}>
                  {item.score}/{item.total_questions} • {formattedDate}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderExploreView = () => {
    // Use dynamic exams data, fallback to static CATEGORIES if exams is empty
    // Always show something - never show empty state for Explore tab
    const categoriesToRender = exams.length > 0 ? exams as Category[] : CATEGORIES;
    
    // Show loading only if we're still loading AND have no cached data
    if (loading && categoriesToRender.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF512F" />
        </View>
      );
    }
    
    return (
      <View style={styles.gridWrapper}>
        {categoriesToRender.map((item, index) => {
          // Handle both 'title' and 'name' fields from database
          const displayTitle = (item as any).title || (item as any).name || 'Unknown';
          const uniqueKey = item.id || `category-${index}`;
          return (
            <View key={uniqueKey} style={styles.gridItem}>
              {renderGridCard(displayTitle, item.icon as any, () => handleCategoryPress(item as Category))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderTopicCard = (isMockTest: boolean, topicName?: string) => {
    const isSelected = isMockTest 
      ? selectedTopic === null 
      : selectedTopic === topicName;
    
    return (
      <TouchableOpacity
        style={[
          styles.topicCard,
          isMockTest && styles.topicCardMockTest,
          isSelected && styles.topicCardSelected,
        ]}
        onPress={() => setSelectedTopic(isMockTest ? null : topicName || null)}
        activeOpacity={0.8}
      >
        {isMockTest ? (
          <>
            <Text style={styles.topicCardIcon}>🏆</Text>
            <Text style={[
              styles.topicCardTitle,
              isSelected && styles.topicCardTitleSelected,
            ]}>
              Full Mock Test
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="book" size={24} color={isSelected ? "#FF512F" : "#666"} />
            <Text style={[
              styles.topicCardTitle,
              isSelected && styles.topicCardTitleSelected,
            ]}>
              {topicName}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (!selectedExam) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedExam.title}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Horizontal ScrollView for Topics */}
            <View style={styles.modalTopicsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topicCardsContainer}
              >
                {/* Fixed Mock Test Card */}
                {renderTopicCard(true)}
                
                {/* Dynamic Topic Cards */}
                {selectedExam.topics.map((topic, index) => (
                  <Fragment key={`topic-${index}-${topic}`}>
                    {renderTopicCard(false, topic)}
                  </Fragment>
                ))}
              </ScrollView>
            </View>

            {/* Difficulty Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Difficulty</Text>
              <View style={styles.difficultyToggle}>
                {DIFFICULTY_LEVELS.map((difficulty) => {
                  const isSelected = selectedDifficulty === difficulty;
                  return (
                    <TouchableOpacity
                      key={difficulty}
                      style={[
                        styles.difficultySegment,
                        isSelected && styles.difficultySegmentActive,
                      ]}
                      onPress={() => setSelectedDifficulty(difficulty)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.difficultySegmentText,
                          isSelected && styles.difficultySegmentTextActive,
                        ]}
                      >
                        {DIFFICULTY_LABELS[difficulty]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Modal Footer - Play Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalStartButton,
                  styles.modalStartButtonFull,
                  (selectedTopic === undefined || isGenerating || isButtonDisabled) && styles.modalStartButtonDisabled,
                ]}
                onPress={handleStartQuiz}
                disabled={selectedTopic === undefined || isGenerating || isButtonDisabled}
                activeOpacity={0.8}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalStartButtonText}>Start Quiz</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderCommunityRescueModal = () => {
    const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
      switch (difficulty.toLowerCase()) {
        case 'easy':
          return '#4CAF50';
        case 'medium':
          return '#FF9800';
        case 'hard':
          return '#F44336';
        default:
          return '#666';
      }
    };

    const getDifficultyLabel = (difficulty: 'easy' | 'medium' | 'hard') => {
      switch (difficulty.toLowerCase()) {
        case 'easy':
          return 'Easy';
        case 'medium':
          return 'Medium';
        case 'hard':
          return 'Hard';
        default:
          return difficulty;
      }
    };

    return (
      <Modal
        visible={showCommunityRescueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCommunityRescueModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowCommunityRescueModal(false)}
        >
          <Pressable 
            style={styles.communityModalContent} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.communityModalHeader}>
              <View>
                <Text style={styles.communityModalTitle}>AI is Busy... Try these active sets!</Text>
                <Text style={styles.communityModalSubtitle}>Jump into these popular topics while you wait.</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCommunityRescueModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Community Sets List */}
            <ScrollView 
              style={styles.communitySetsScrollView}
              contentContainerStyle={styles.communitySetsContainer}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingCommunitySets ? (
                <View style={styles.communityLoadingContainer}>
                  <ActivityIndicator size="large" color="#FF512F" />
                </View>
              ) : communitySets.length === 0 ? (
                <View style={styles.communityEmptyState}>
                  <Ionicons name="layers-outline" size={48} color="#ccc" />
                  <Text style={styles.communityEmptyText}>No community sets available</Text>
                </View>
              ) : (
                communitySets.map((item, index) => (
                  <TouchableOpacity
                    key={`community-${index}-${item.topic}-${item.difficulty}`}
                    style={styles.communityCard}
                    onPress={() => handleInstantPlay(item.topic, item.difficulty)}
                    activeOpacity={0.8}
                  >
                    {/* Left Icon */}
                    <View style={styles.communityCardIcon}>
                      <Ionicons 
                        name={getTopicIcon(item.topic) as any} 
                        size={32} 
                        color="#FF512F" 
                      />
                    </View>

                    {/* Content */}
                    <View style={styles.communityCardContent}>
                      {/* Title and Badge */}
                      <View style={styles.communityCardHeader}>
                        <Text style={styles.communityCardTitle}>{item.topic}</Text>
                        <View 
                          style={[
                            styles.difficultyBadge,
                            { backgroundColor: getDifficultyColor(item.difficulty) }
                          ]}
                        >
                          <Text style={styles.difficultyBadgeText}>
                            {getDifficultyLabel(item.difficulty)}
                          </Text>
                        </View>
                      </View>

                      {/* Footer */}
                      <View style={styles.communityCardFooter}>
                        <Text style={styles.communityCardFooterText}>
                          Fresh {timeAgo(item.last_active)} • {item.question_count} Qs available
                        </Text>
                      </View>
                    </View>

                    {/* Right Arrow */}
                    <View style={styles.communityCardArrow}>
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // Don't block UI for errors - show them inline instead
  // The Explore tab should always be accessible

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <Text style={styles.titleBarText}>New Quiz</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcherContainer}>
        {renderTabSwitcher()}
      </View>

      {/* Content */}
      {loading && exams.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF512F" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Show error banner if there's an error (non-blocking) */}
            {error && !showCommunityRescueModal && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#FF6B35" />
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity
                  onPress={() => setError(null)}
                  style={styles.errorBannerClose}
                >
                  <Ionicons name="close" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {activeTab === 'recent' ? renderRecentView() : renderExploreView()}
          </View>
        </ScrollView>
      )}

      {/* Modal */}
      {renderModal()}

      {/* Community Rescue Modal */}
      {renderCommunityRescueModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  titleBar: {
    backgroundColor: '#FF512F',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
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
    backgroundColor: '#FF512F',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#FF512F',
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
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentCardContent: {
    flex: 1,
  },
  recentCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  recentCardSubtitle: {
    fontSize: 13,
    color: '#666',
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
    borderColor: '#FF512F',
    borderWidth: 4,
    shadowColor: '#FF512F',
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
    color: '#FF512F',
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
    shadowColor: '#FF512F',
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
    color: '#FF512F',
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
    shadowColor: '#FF512F',
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
    color: '#FF512F',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
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
  modalStartButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#FF512F',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#FF512F',
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
  modalStartButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
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
    backgroundColor: '#FF512F',
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
    borderLeftColor: '#FF6B35',
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
});

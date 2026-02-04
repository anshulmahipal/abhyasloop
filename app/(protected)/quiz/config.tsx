import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { generateQuiz } from '../../../lib/api';

type TabType = 'recent' | 'explore';

interface RecentTopic {
  id: string;
  name: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  topics: string[];
}

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

export default function QuizConfigPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  // Tab state - smart default: if no recent history, default to 'explore'
  const [activeTab, setActiveTab] = useState<TabType>(MOCK_RECENT_TOPICS.length === 0 ? 'explore' : 'recent');
  
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

  const currentFocus = profile?.current_focus || 'General Knowledge';

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
      
      // If selectedTopic is null, it means "Full Mock Test" was selected
      // Use the exam title as the topic, or 'all' for mock test
      const topicForQuiz = selectedTopic === null ? selectedExam.title : selectedTopic;
      
      const response = await generateQuiz(
        topicForQuiz,
        selectedDifficulty,
        currentFocus,
        parseInt(questionCount, 10)
      );
      
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
      
      const isRateLimit = error instanceof Error && 
                         ((error as any).isRateLimit || 
                          error.message.includes('Please wait') ||
                          error.message.includes('active quiz') ||
                          error.message.includes('1 minute') ||
                          error.message.includes('Take a moment') ||
                          error.message.includes('Great job') ||
                          error.message.includes("You're on fire") ||
                          error.message.includes('Well done'));
      
      if (isRateLimit) {
        Alert.alert(
          'Take a Quick Break!',
          error instanceof Error ? error.message : 'Please finish your current quiz or wait a moment to start a new one.'
        );
      } else {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to generate quiz. Please try again.'
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTabSwitcher = () => (
    <View style={styles.tabSwitcher}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'recent' && styles.tabButtonActive]}
        onPress={() => setActiveTab('recent')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabButtonText, activeTab === 'recent' && styles.tabButtonTextActive]}>
          Recent
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'explore' && styles.tabButtonActive]}
        onPress={() => setActiveTab('explore')}
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
    if (MOCK_RECENT_TOPICS.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No Recent Topics</Text>
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
      <View style={styles.gridWrapper}>
        {MOCK_RECENT_TOPICS.map((item) => (
          <View key={item.id} style={styles.gridItem}>
            {renderGridCard(item.name, 'book', () => handleRecentTopicPress(item), true)}
          </View>
        ))}
      </View>
    );
  };

  const renderExploreView = () => (
    <View style={styles.gridWrapper}>
      {CATEGORIES.map((item) => (
        <View key={item.id} style={styles.gridItem}>
          {renderGridCard(item.title, item.icon as any, () => handleCategoryPress(item))}
        </View>
      ))}
    </View>
  );

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
                {selectedExam.topics.map((topic) => renderTopicCard(false, topic))}
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {activeTab === 'recent' ? renderRecentView() : renderExploreView()}
        </View>
      </ScrollView>

      {/* Modal */}
      {renderModal()}
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
});

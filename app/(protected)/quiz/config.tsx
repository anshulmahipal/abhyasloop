import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { generateQuiz } from '../../../lib/api';

const SUBJECTS = ['Quant', 'Reasoning', 'English', 'Current Affairs'];

const TRENDING_TOPICS: Record<string, string[]> = {
  Quant: ['Data Interpretation', 'Simplification', 'Number Series', 'Quadratic Eq'],
  Reasoning: ['Puzzles', 'Syllogism', 'Blood Relations'],
  English: ['Reading Comprehension', 'Cloze Test', 'Error Spotting'],
  'Current Affairs': ['National News', 'International Affairs', 'Science & Tech', 'Sports'],
};

const QUESTION_COUNTS = ['5', '10', '15', '20'];

const DIFFICULTY_LEVELS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS = {
  easy: '🟢 Warm Up',
  medium: '🟡 Standard',
  hard: '🔥 Hell Mode',
};

export default function QuizConfigPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<string>('Quant');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState<string>('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const buttonDisableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current_focus from user profile, default to 'General Knowledge' if not set
  const currentFocus = profile?.current_focus || 'General Knowledge';
  
  // Get trending topics based on selected subject
  const trendingTopics = TRENDING_TOPICS[selectedSubject] || [];

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (buttonDisableTimeoutRef.current) {
        clearTimeout(buttonDisableTimeoutRef.current);
      }
    };
  }, []);

  const handleSubjectPress = (subject: string) => {
    setSelectedSubject(subject);
    // Clear selected topic when subject changes
    setSelectedTopic('');
  };

  const handleTopicPress = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleStartQuiz = async () => {
    if (!selectedTopic || selectedTopic.trim() === '') {
      Alert.alert('Select Topic', 'Please select or enter a topic to start the quiz.');
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
      
      // Generate quiz with current_focus from profile, topic, difficulty, and question count
      const response = await generateQuiz(selectedTopic, selectedDifficulty, currentFocus, parseInt(questionCount, 10));
      
      // Navigate to quiz page with generated quiz ID and params
      router.push({
        pathname: '/(protected)/quiz/[id]',
        params: {
          id: response.quizId,
          topic: selectedTopic,
          difficulty: selectedDifficulty,
          examType: currentFocus,
        },
      });
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      
      // Check if this is a rate limit error (429 or "Please wait" message)
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
        // Show the beautiful, encouraging message from the API
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

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return '#4CAF50'; // Green
      case 'medium':
        return '#FFC107'; // Yellow
      case 'hard':
        return '#F44336'; // Red
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screenWrapper}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Simple Title Bar */}
          <View style={styles.titleBar}>
            <Text style={styles.titleBarText}>Quiz Configuration</Text>
          </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Main Settings Card */}
            <View style={styles.mainCard}>
              {/* Subject Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subject</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.subjectContainer}
                  contentContainerStyle={styles.subjectContent}
                >
                  {SUBJECTS.map((subject) => (
                    <TouchableOpacity
                      key={subject}
                      style={[
                        styles.subjectPill,
                        selectedSubject === subject && styles.subjectPillSelected,
                      ]}
                      onPress={() => handleSubjectPress(subject)}
                    >
                      <Text
                        style={[
                          styles.subjectPillText,
                          selectedSubject === subject && styles.subjectPillTextSelected,
                        ]}
                      >
                        {subject}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Topic Input Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Topic</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="search" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="What are we studying?"
                    placeholderTextColor="#999"
                    value={selectedTopic}
                    onChangeText={setSelectedTopic}
                    autoCapitalize="words"
                  />
                </View>
                
                {/* Trending Topics */}
                <Text style={styles.trendingTitle}>Trending Topics</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.topicsContainer}
                  contentContainerStyle={styles.topicsContent}
                >
                  {trendingTopics.map((topic) => (
                    <TouchableOpacity
                      key={topic}
                      style={[
                        styles.topicTag,
                        selectedTopic.toLowerCase() === topic.toLowerCase() && styles.topicTagSelected,
                      ]}
                      onPress={() => handleTopicPress(topic)}
                    >
                      <Text
                        style={[
                          styles.topicTagText,
                          selectedTopic.toLowerCase() === topic.toLowerCase() && styles.topicTagTextSelected,
                        ]}
                      >
                        {topic}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Question Count Control */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Number of Questions</Text>
                <View style={styles.questionCountToggle}>
                  {QUESTION_COUNTS.map((count) => {
                    const isSelected = questionCount === count;
                    return (
                      <TouchableOpacity
                        key={count}
                        style={[
                          styles.questionCountSegment,
                          isSelected && styles.questionCountSegmentActive,
                        ]}
                        onPress={() => setQuestionCount(count)}
                      >
                        <Text
                          style={[
                            styles.questionCountSegmentText,
                            isSelected && styles.questionCountSegmentTextActive,
                          ]}
                        >
                          {count}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Challenge Level Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Challenge Level</Text>
                <View style={styles.difficultyToggle}>
                  {DIFFICULTY_LEVELS.map((difficulty) => {
                    const isSelected = selectedDifficulty === difficulty;
                    const color = getDifficultyColor(difficulty);
                    
                    return (
                      <TouchableOpacity
                        key={difficulty}
                        style={[
                          styles.difficultySegment,
                          isSelected && styles.difficultySegmentActive,
                          isSelected && { backgroundColor: '#ffffff', shadowColor: color },
                        ]}
                        onPress={() => setSelectedDifficulty(difficulty)}
                      >
                        <Text
                          style={[
                            styles.difficultySegmentText,
                            isSelected && { color },
                            !isSelected && { color: '#666' },
                          ]}
                        >
                          {DIFFICULTY_LABELS[difficulty]}
                        </Text>
                        {isSelected && (
                          <View style={[styles.difficultyIndicator, { backgroundColor: color }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Generate Quiz Button - Inside ScrollView */}
            <View style={styles.launchButtonContainer}>
              <TouchableOpacity
                style={styles.launchButton}
                onPress={handleStartQuiz}
                disabled={!selectedTopic || selectedTopic.trim() === '' || isGenerating || isButtonDisabled}
                activeOpacity={0.9}
              >
                {isGenerating ? (
                  <LinearGradient
                    colors={['#FF6B35', '#F44336']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.launchButtonGradient}
                  >
                    <ActivityIndicator color="#ffffff" size="large" />
                    <Text style={[styles.launchButtonText, { marginTop: 8 }]}>Generating...</Text>
                  </LinearGradient>
                ) : (
                  <LinearGradient
                    colors={['#FF6B35', '#F44336']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.launchButtonGradient,
                      (!selectedTopic || selectedTopic.trim() === '' || isButtonDisabled) && styles.launchButtonGradientDisabled,
                    ]}
                  >
                    <Text style={styles.launchButtonText}>GENERATE QUIZ 🚀</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150, // Space to clear floating tab bar
    paddingTop: 20,
  },
  container: {
    padding: 24,
    maxWidth: 500, // Mobile app card width on web
    alignSelf: 'center',
    width: '90%',
  },
  // Simple Title Bar
  titleBar: {
    backgroundColor: '#FF6B35',
    paddingTop: Platform.OS === 'web' ? 20 : 12,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  titleBarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  // Main Card
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  // Subject Pills
  subjectContainer: {
    marginTop: 8,
  },
  subjectContent: {
    paddingRight: 20,
  },
  subjectPill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  subjectPillSelected: {
    backgroundColor: '#FF512F',
    borderColor: '#FF512F',
  },
  subjectPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  subjectPillTextSelected: {
    color: '#ffffff',
  },
  // Topic Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  // Trending Topics
  topicsContainer: {
    marginTop: 8,
  },
  topicsContent: {
    paddingRight: 20,
  },
  topicTag: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  topicTagSelected: {
    backgroundColor: '#FF512F',
    borderColor: '#FF512F',
  },
  topicTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  topicTagTextSelected: {
    color: '#ffffff',
  },
  // Question Count Toggle
  questionCountToggle: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  questionCountSegmentTextActive: {
    color: '#FF512F',
    fontWeight: '700',
  },
  // Difficulty Toggle
  difficultyToggle: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  difficultySegment: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  difficultySegmentActive: {
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  difficultySegmentText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  difficultyIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Launch Button - Inside ScrollView
  launchButtonContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
    maxWidth: 500, // Match card width
    alignSelf: 'center',
    width: '100%',
  },
  launchButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  launchButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
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
  launchButtonGradientDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  launchButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

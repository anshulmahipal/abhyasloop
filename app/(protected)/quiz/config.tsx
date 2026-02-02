import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { generateQuiz } from '../../../lib/api';

const SMART_TOPICS: Record<string, string[]> = {
  SSC: ['Trigonometry', 'Geometry', 'Algebra', 'GK'],
  Banking: ['Data Interpretation', 'Simplification', 'Banking Awareness'],
};

const DIFFICULTY_LEVELS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

export default function QuizConfigPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const buttonDisableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current_focus from user profile, default to 'General Knowledge' if not set
  const currentFocus = profile?.current_focus || 'General Knowledge';
  
  // Get smart topics based on focus
  const getSmartTopics = (): string[] => {
    if (!currentFocus || currentFocus === 'General Knowledge') {
      // Default topics if no focus is set
      return ['General Knowledge', 'Mathematics', 'English', 'Reasoning'];
    }
    
    // Check if focus contains 'SSC' (case-insensitive)
    if (currentFocus.toUpperCase().includes('SSC')) {
      return SMART_TOPICS.SSC;
    }
    
    // Check if focus contains 'Banking' (case-insensitive)
    if (currentFocus.toUpperCase().includes('BANKING') || currentFocus.toUpperCase().includes('BANK')) {
      return SMART_TOPICS.Banking;
    }
    
    // Default topics for other exam types
    return ['General Knowledge', 'Mathematics', 'English', 'Reasoning'];
  };

  const topics = getSmartTopics();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (buttonDisableTimeoutRef.current) {
        clearTimeout(buttonDisableTimeoutRef.current);
      }
    };
  }, []);

  const handleChipPress = (topic: string) => {
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
      
      // Generate quiz with current_focus from profile, topic, and difficulty
      const response = await generateQuiz(selectedTopic, selectedDifficulty, currentFocus);
      
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
    <View style={styles.screenWrapper}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#FF6B35', '#F44336']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>New Mission</Text>
            <View style={styles.contextPill}>
              <Text style={styles.contextPillText}>
                Targeting: {currentFocus}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>

          {/* Topic Section Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Topic</Text>
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
            
            {/* Quick Chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.chipsContainer}
              contentContainerStyle={styles.chipsContent}
            >
              {topics.map((topic) => (
                <TouchableOpacity
                  key={topic}
                  style={[
                    styles.chip,
                    selectedTopic.toLowerCase() === topic.toLowerCase() && styles.chipSelected,
                  ]}
                  onPress={() => handleChipPress(topic)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedTopic.toLowerCase() === topic.toLowerCase() && styles.chipTextSelected,
                    ]}
                  >
                    {topic}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Difficulty Section Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Intensity Level</Text>
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
                        !isSelected && difficulty === 'medium' && { color: '#FF8C00' }, // Darker Orange/Gold for Medium
                        !isSelected && difficulty !== 'medium' && { color: '#666' },
                      ]}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
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
      </ScrollView>

      {/* Launch Button - Floating */}
      <View style={styles.launchButtonContainer}>
        <TouchableOpacity
          style={styles.launchButton}
          onPress={handleStartQuiz}
          disabled={!selectedTopic || selectedTopic.trim() === '' || isGenerating || isButtonDisabled}
          activeOpacity={0.9}
        >
          {isGenerating ? (
            <View style={styles.launchButtonGradient}>
              <ActivityIndicator color="#ffffff" />
            </View>
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
      </KeyboardAvoidingView>
    </View>
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
  // Gradient Header
  headerGradient: {
    width: '100%',
    height: 200, // Fixed height instead of percentage
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Safe area padding
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 2, // Cards sit on top of header
  },
  scrollContent: {
    paddingBottom: 140, // Space for floating launch button
  },
  container: {
    marginTop: -60, // Overlap effect
    padding: 24,
    paddingTop: 0,
    maxWidth: 500, // Mobile app card width on web
    alignSelf: 'center',
    width: '90%',
    zIndex: 2,
  },
  // Context Pill (inside header)
  contextPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contextPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Card Styles (overlapping header)
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  // Topic Input (Neumorphic)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    // Inner shadow effect (neumorphic)
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
  // Chips
  chipsContainer: {
    marginTop: 8,
  },
  chipsContent: {
    paddingRight: 20,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chipTextSelected: {
    color: '#ffffff',
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
    letterSpacing: 0.5,
  },
  difficultyIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Launch Button - Floating
  launchButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Safe area padding for iPhone
    maxWidth: 500, // Match card width
    alignSelf: 'center',
    width: '90%',
    zIndex: 3,
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

import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
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
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
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

  const handleStartQuiz = async () => {
    if (!selectedTopic) {
      Alert.alert('Select Topic', 'Please select a topic to start the quiz.');
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

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text style={styles.title}>Quiz Configuration</Text>
        
        <View style={styles.focusBadge}>
          <Text style={styles.focusText}>Preparing for: {currentFocus}</Text>
        </View>

        {/* Topic Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Topic</Text>
          <View style={styles.optionsGrid}>
            {topics.map((topic) => (
              <TouchableOpacity
                key={topic}
                style={[
                  styles.optionCard,
                  selectedTopic === topic && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedTopic(topic)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedTopic === topic && styles.optionTextSelected,
                  ]}
                >
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Difficulty</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTY_LEVELS.map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={[
                  styles.difficultyButton,
                  selectedDifficulty === difficulty && styles.difficultyButtonSelected,
                ]}
                onPress={() => setSelectedDifficulty(difficulty)}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    selectedDifficulty === difficulty && styles.difficultyTextSelected,
                  ]}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[
            styles.startButton,
            (!selectedTopic || isGenerating || isButtonDisabled) && styles.startButtonDisabled,
          ]}
          onPress={handleStartQuiz}
          disabled={!selectedTopic || isGenerating || isButtonDisabled}
        >
          {isGenerating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.startButtonText}>Start Quiz</Text>
          )}
        </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  focusBadge: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 32,
  },
  focusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
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
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#007AFF',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
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
  difficultyButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  difficultyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  difficultyTextSelected: {
    color: '#007AFF',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

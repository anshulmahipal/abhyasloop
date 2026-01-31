import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import mockQuestions from '../../../data/mockQuestions.json';
import { Question } from '../../../types';

// Required for static rendering with dynamic routes
export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ];
}

export default function QuizPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const questions: Question[] = mockQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswered) return;
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);

    // Check if answer is correct
    if (optionIndex === currentQuestion.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (!isAnswered) return;

    if (isLastQuestion) {
      // Navigate to results page
      router.push({
        pathname: '/(protected)/result',
        params: {
          score: score.toString(),
          total: questions.length.toString(),
        },
      });
    } else {
      // Move to next question
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOptionStyle = (optionIndex: number) => {
    if (!isAnswered) {
      return selectedOption === optionIndex ? styles.optionSelected : styles.option;
    }

    // After answering, show correct/incorrect states
    if (optionIndex === currentQuestion.correctIndex) {
      return styles.optionCorrect;
    }
    if (selectedOption === optionIndex && optionIndex !== currentQuestion.correctIndex) {
      return styles.optionIncorrect;
    }
    return styles.option;
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.container, { paddingHorizontal: isMobile ? 20 : 40 }]}>
        {/* Header: Progress and Timer */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {currentIndex + 1} of {questions.length}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentIndex + 1) / questions.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>⏱️ {formatTime(timer)}</Text>
          </View>
        </View>

        {/* Question Section */}
        <View style={styles.questionSection}>
          <Text style={[styles.difficultyBadge, { 
            backgroundColor: 
              currentQuestion.difficulty === 'easy' ? '#4CAF50' :
              currentQuestion.difficulty === 'medium' ? '#FF9800' : '#F44336'
          }]}>
            {currentQuestion.difficulty.toUpperCase()}
          </Text>
          <Text style={[styles.questionText, { fontSize: isMobile ? 20 : 24 }]}>
            {currentQuestion.question}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[getOptionStyle(index), { padding: isMobile ? 16 : 20 }]}
              onPress={() => handleOptionSelect(index)}
              disabled={isAnswered}
            >
              <Text style={[
                styles.optionText,
                { fontSize: isMobile ? 16 : 18 },
                isAnswered && index === currentQuestion.correctIndex && styles.optionTextCorrect,
                isAnswered && selectedOption === index && index !== currentQuestion.correctIndex && styles.optionTextIncorrect,
              ]}>
                {String.fromCharCode(65 + index)}. {option}
              </Text>
              {isAnswered && index === currentQuestion.correctIndex && (
                <Text style={styles.correctMark}>✓</Text>
              )}
              {isAnswered && selectedOption === index && index !== currentQuestion.correctIndex && (
                <Text style={styles.incorrectMark}>✗</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Explanation (shown after answering) */}
        {isAnswered && (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>Explanation:</Text>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}

        {/* Next Button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !isAnswered && styles.nextButtonDisabled,
            { marginTop: isMobile ? 20 : 30 }
          ]}
          onPress={handleNext}
          disabled={!isAnswered}
        >
          <Text style={styles.nextButtonText}>
            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
          </Text>
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
    paddingVertical: 30,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressContainer: {
    flex: 1,
    marginRight: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  timerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  questionSection: {
    marginBottom: 30,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 32,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  option: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  optionCorrect: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  optionIncorrect: {
    backgroundColor: '#ffebee',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 18,
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  optionTextCorrect: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#c62828',
    fontWeight: '600',
  },
  correctMark: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  incorrectMark: {
    fontSize: 24,
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  explanationContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

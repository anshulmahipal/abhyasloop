import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Question {
  id?: string | number;
  question_text?: string;
  question?: string;
  options: string[];
  correct_index?: number;
  correctIndex?: number;
  explanation?: string;
}

export default function QuizReviewSimplePage() {
  const params = useLocalSearchParams<{ questions?: string; userAnswers?: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Parse questions JSON string
      if (params.questions) {
        const parsedQuestions = JSON.parse(params.questions);
        setQuestions(Array.isArray(parsedQuestions) ? parsedQuestions : []);
      }

      // Parse userAnswers JSON string
      if (params.userAnswers) {
        const parsedAnswers = JSON.parse(params.userAnswers);
        setUserAnswers(Array.isArray(parsedAnswers) ? parsedAnswers : []);
      }
    } catch (error) {
      console.error('Error parsing navigation params:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.questions, params.userAnswers]);

  const handleDone = () => {
    router.replace('/(protected)/dashboard');
  };

  const getQuestionText = (question: Question): string => {
    return question.question_text || question.question || '';
  };

  const getCorrectIndex = (question: Question): number => {
    return question.correct_index !== undefined ? question.correct_index : (question.correctIndex || 0);
  };

  const renderQuestionCard = ({ item, index }: { item: Question; index: number }) => {
    const questionText = getQuestionText(item);
    const correctIndex = getCorrectIndex(item);
    const userAnswer = userAnswers[index] ?? null;
    const isCorrect = userAnswer === correctIndex;
    const options = item.options || [];

    return (
      <View style={styles.questionCard}>
        {/* Header */}
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>Question {index + 1} of {questions.length}</Text>
          {isCorrect ? (
            <View style={styles.correctBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.correctBadgeText}>Correct</Text>
            </View>
          ) : (
            <View style={styles.incorrectBadge}>
              <Ionicons name="close-circle" size={20} color="#F44336" />
              <Text style={styles.incorrectBadgeText}>Incorrect</Text>
            </View>
          )}
        </View>

        {/* Question Text */}
        <Text style={styles.questionText}>{questionText}</Text>

        {/* Options List */}
        <View style={styles.optionsContainer}>
          {options.map((option, optionIndex) => {
            const isCorrectAnswer = optionIndex === correctIndex;
            const isUserSelected = optionIndex === userAnswer;
            const isWrongSelection = isUserSelected && !isCorrectAnswer;

            let optionStyle = styles.option;
            let optionTextStyle = styles.optionText;

            if (isCorrectAnswer) {
              optionStyle = [styles.option, styles.correctOption];
              optionTextStyle = [styles.optionText, styles.correctOptionText];
            } else if (isWrongSelection) {
              optionStyle = [styles.option, styles.wrongOption];
              optionTextStyle = [styles.optionText, styles.wrongOptionText];
            }

            return (
              <View key={optionIndex} style={optionStyle}>
                <Text style={styles.optionLabel}>
                  {String.fromCharCode(65 + optionIndex)}.
                </Text>
                <Text style={optionTextStyle}>{option}</Text>
                {isCorrectAnswer && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.optionIcon} />
                )}
                {isWrongSelection && (
                  <Ionicons name="close-circle" size={20} color="#F44336" style={styles.optionIcon} />
                )}
              </View>
            );
          })}
        </View>

        {/* Explanation Section */}
        {item.explanation && (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>Explanation</Text>
            <Text style={styles.explanationText}>{item.explanation}</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading review...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Review</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No questions to review</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleDone}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz Review</Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.7}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Questions List */}
      <FlatList
        data={questions}
        renderItem={renderQuestionCard}
        keyExtractor={(item, index) => item.id?.toString() || `question-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  doneButton: {
    padding: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF512F',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  correctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  correctBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  incorrectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incorrectBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 20,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  correctOption: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  wrongOption: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginRight: 12,
    minWidth: 24,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  correctOptionText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  wrongOptionText: {
    color: '#C62828',
    fontWeight: '600',
  },
  optionIcon: {
    marginLeft: 8,
  },
  explanationContainer: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

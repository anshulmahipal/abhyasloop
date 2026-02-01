import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTimer } from '../../../hooks/useTimer';
import { useQuizLogic } from '../../../hooks/useQuizLogic';
import { QuizOption } from '../../../components/QuizOption';
import { ProgressBar } from '../../../components/ProgressBar';
import { DifficultyBadge } from '../../../components/DifficultyBadge';
import { logger } from '../../../lib/logger';
import { generateQuiz } from '../../../lib/api';
import { Question } from '../../../types';

export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ];
}

export default function QuizPage() {
  const params = useLocalSearchParams<{ 
    id?: string; 
    topic?: string; 
    difficulty?: 'easy' | 'medium' | 'hard' 
  }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { timer, formatTime } = useTimer(true);

  // Get topic and difficulty from params, with defaults
  const topic = params.topic || 'General Knowledge';
  const difficulty = (params.difficulty || 'medium') as 'easy' | 'medium' | 'hard';

  const userInfo = {
    id: params.id || 'unknown',
    name: 'Quiz User',
  };

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await logger.apiCallAsync(
        'Generate Quiz',
        async () => {
          return await generateQuiz(topic, difficulty);
        },
        {
          url: 'generate-quiz',
          method: 'POST',
          userInfo,
        }
      );

      // Map API response to Question interface format
      // Note: API returns UUID string IDs, but Question type expects number IDs
      // Using index+1 for now to match existing type, but could update type later
      const mappedQuestions: Question[] = response.questions.map((q, index: number) => ({
        id: index + 1,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
        explanation: q.explanation,
      }));

      setQuestions(mappedQuestions);
      logger.info('Quiz loaded successfully', { 
        questionCount: mappedQuestions.length,
        quizId: response.quizId,
        topic,
        difficulty,
      });
    } catch (err) {
      logger.error('Failed to generate quiz', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to generate quiz. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [topic, difficulty]);

  const handleQuizComplete = (score: number, total: number) => {
    logger.userAction('Navigating to Results', userInfo, { score, total });
    router.push({
      pathname: '/(protected)/result',
      params: {
        score: score.toString(),
        total: total.toString(),
      },
    });
  };

  const {
    currentQuestion,
    currentQuestionIndex,
    selectedOptionIndex,
    score,
    hasUserAnswered,
    isLastQuestion,
    progressPercentage,
    handleOptionSelect,
    handleNext,
    getOptionState,
  } = useQuizLogic({
    questions,
    onQuizComplete: handleQuizComplete,
    userInfo,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchQuiz}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No questions available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
        <View style={styles.header}>
          <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>⏱️ {formatTime(timer)}</Text>
          </View>
        </View>

        <View style={styles.questionSection}>
          <DifficultyBadge difficulty={currentQuestion.difficulty} />
          <Text style={[styles.questionText, isMobile && styles.questionTextMobile]}>
            {currentQuestion.question}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <QuizOption
              key={index}
              option={option}
              optionIndex={index}
              state={getOptionState(index)}
              onPress={() => handleOptionSelect(index)}
              disabled={hasUserAnswered}
              fontSize={isMobile ? 16 : 18}
            />
          ))}
        </View>

        {hasUserAnswered && (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>Explanation:</Text>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextButton, !hasUserAnswered && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!hasUserAnswered}
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
  containerMobile: {
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 32,
  },
  questionTextMobile: {
    fontSize: 20,
  },
  optionsContainer: {
    marginBottom: 20,
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
    marginTop: 30,
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

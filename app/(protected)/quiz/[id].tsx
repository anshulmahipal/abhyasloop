import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTimer } from '../../../hooks/useTimer';
import { useQuizLogic } from '../../../hooks/useQuizLogic';
import { QuizOption } from '../../../components/QuizOption';
import { ProgressBar } from '../../../components/ProgressBar';
import { DifficultyBadge } from '../../../components/DifficultyBadge';
import mockQuestions from '../../../data/mockQuestions.json';
import { Question } from '../../../types';

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

  const questions: Question[] = mockQuestions as Question[];
  const { timer, formatTime } = useTimer(true);

  const handleQuizComplete = (score: number, total: number) => {
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
  });

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
});

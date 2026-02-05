import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTimer } from '../../../hooks/useTimer';
import { useQuizLogic } from '../../../hooks/useQuizLogic';
import { QuizOption } from '../../../components/QuizOption';
import { DifficultyBadge } from '../../../components/DifficultyBadge';
import { logger } from '../../../lib/logger';
import { generateQuiz } from '../../../lib/api';
import { Question } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { saveMistakes } from '../../../lib/mistakeSync';

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
    difficulty?: 'easy' | 'medium' | 'hard';
    examType?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const { timer, formatTime } = useTimer(true);
  const { user, profile, refreshProfile, session } = useAuth();

  // Get topic, difficulty, and examType from params, with defaults
  const topic = params.topic || 'General Knowledge';
  const difficulty = (params.difficulty || 'medium') as 'easy' | 'medium' | 'hard';
  const examType = params.examType || undefined;
  
  // Get userFocus from profile's current_focus, fallback to examType from params, then default to 'General Knowledge'
  const userFocus = profile?.current_focus || examType || 'General Knowledge';

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
          // Pass current_focus from profile to generateQuiz
          return await generateQuiz(topic, difficulty, userFocus);
        },
        {
          url: 'generate-quiz',
          method: 'POST',
          userInfo,
        }
      );

      console.log('Quiz API response:', response);
      console.log('Response questions:', response.questions);
      console.log('Questions count:', response.questions?.length);

      // Validate response has questions
      if (!response.questions || !Array.isArray(response.questions) || response.questions.length === 0) {
        console.error('Invalid or empty questions array:', response);
        throw new Error('No questions received from the quiz service');
      }

      // Map API response to Question interface format
      // Note: API returns UUID string IDs, but Question type expects number IDs
      // Using index+1 for now to match existing type, but could update type later
      const mappedQuestions: Question[] = response.questions.map((q: any, index: number) => {
        console.log(`Mapping question ${index}:`, q);
        
        // Validate question structure
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          console.error(`Invalid question at index ${index}:`, q);
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
          console.error(`Invalid correctIndex at index ${index}:`, q.correctIndex);
          throw new Error(`Invalid correctIndex at index ${index}`);
        }
        
        return {
          id: q.id || (index + 1), // Preserve UUID from API, fallback to index+1 for compatibility
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          difficulty: (q.difficulty?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard',
          explanation: q.explanation || '',
        };
      });

      console.log('Mapped questions:', mappedQuestions);
      console.log('Mapped questions count:', mappedQuestions.length);
      console.log('First question:', mappedQuestions[0]);

      if (mappedQuestions.length === 0) {
        throw new Error('No valid questions after mapping');
      }

      setQuestions(mappedQuestions);
      setQuizId(response.quizId);
      // Initialize userAnswers array: one slot per question, all null (unanswered)
      // This array will track user's selected option indices (0-3) as they answer questions
      setUserAnswers(new Array(mappedQuestions.length).fill(null));
      console.log('Questions state set, count:', mappedQuestions.length);
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

  /**
   * Handles quiz submission when user completes the last question.
   * Calculates score, saves to database, implements gamification (coins & streak), and navigates to result screen.
   */
  const handleFinish = async () => {
    // Validate required data
    if (!quizId) {
      Alert.alert('Error', 'Quiz ID is missing. Please try again.');
      logger.error('Quiz submission failed: missing quizId', { quizId });
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User authentication required. Please sign in again.');
      logger.error('Quiz submission failed: missing user', {});
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate score by comparing user's selected index with correct_index
      let score = 0;
      for (let i = 0; i < questions.length; i++) {
        const userSelectedIndex = userAnswers[i];
        const correctIndex = questions[i].correctIndex;
        
        if (userSelectedIndex !== null && userSelectedIndex === correctIndex) {
          score++;
        }
      }

      const totalQuestions = questions.length;
      const correctCount = score;

      // Capture userAnswers state: array of selected option indices (0-3) or null for unanswered
      // Example: [0, 2, null, 3] means: Q1=option A, Q2=option C, Q3=unanswered, Q4=option D
      const userAnswersArray = userAnswers;

      logger.info('Calculating quiz score', {
        score,
        totalQuestions,
        userAnswers: userAnswersArray,
        quizId,
      });

      // Convert userAnswers (JS camelCase) to user_answers (DB snake_case) format
      // Replace null values with -1 to represent unanswered questions in JSONB array
      // DB column name: user_answers (snake_case)
      const userAnswersForDb = userAnswersArray.map(answer => answer === null ? -1 : answer);

      // Fetch user profile to get last_active_date and current_streak for gamification
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('last_active_date, current_streak, coins')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        logger.error('Failed to fetch profile for gamification', profileError);
        // Continue without gamification if profile fetch fails
      }

      // Calculate coins: 10 coins per correct answer
      const totalEarned = correctCount * 10;

      // Calculate streak based on last_active_date
      let newStreak = 1;
      if (profileData) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastActiveDate = profileData.last_active_date 
          ? new Date(profileData.last_active_date)
          : null;
        
        if (lastActiveDate) {
          lastActiveDate.setHours(0, 0, 0, 0);
          
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastActiveDate.getTime() === today.getTime()) {
            // Already played today: keep current streak
            newStreak = profileData.current_streak || 0;
          } else if (lastActiveDate.getTime() === yesterday.getTime()) {
            // Played yesterday: increment streak
            newStreak = (profileData.current_streak || 0) + 1;
          } else {
            // Missed a day: reset streak to 1
            newStreak = 1;
          }
        } else {
          // No last_active_date: first time playing, streak = 1
          newStreak = 1;
        }
      }

      const todayDateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Update profiles table with coins, streak, and last_active_date
      const profileUpdateData: {
        coins?: number;
        current_streak: number;
        last_active_date: string;
      } = {
        current_streak: newStreak,
        last_active_date: todayDateString,
      };

      // Increment coins if profile exists
      if (profileData) {
        profileUpdateData.coins = (profileData.coins || 0) + totalEarned;
      } else {
        // If profile doesn't exist, set initial coins
        profileUpdateData.coins = totalEarned;
      }

      // Save quiz_attempts and update profiles in parallel
      const [attemptResult, profileResult] = await Promise.all([
        supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: quizId,
            user_id: user.id,
            score: score,
            total_questions: totalQuestions,
            user_answers: userAnswersForDb,
          })
          .select('id')
          .single(),
        supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('id', user.id)
          .select('id, coins, current_streak, last_active_date')
          .single(),
      ]);

      const { data: attemptData, error: insertError } = attemptResult;
      const { error: profileUpdateError } = profileResult;

      // Error handling: If insert fails, alert the error
      if (insertError) {
        console.error('Error saving quiz attempt:', insertError);
        logger.error('Failed to save quiz attempt', insertError);
        Alert.alert(
          'Error',
          insertError.message || 'Failed to save your quiz results. Please try again.'
        );
        setIsSubmitting(false);
        return;
      }

      if (!attemptData || !attemptData.id) {
        console.error('No attempt data returned from insert');
        logger.error('Failed to save quiz attempt: no data returned');
        Alert.alert('Error', 'Failed to save your quiz results. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Log profile update errors but don't block navigation
      if (profileUpdateError) {
        console.error('Error updating profile (gamification):', profileUpdateError);
        logger.error('Failed to update profile gamification', profileUpdateError);
      } else {
        logger.info('Gamification updated', {
          coinsEarned: totalEarned,
          newStreak,
          totalCoins: profileUpdateData.coins,
        });
        // Refresh profile in AuthContext to update UI with new coins and streak
        refreshProfile().catch((err) => {
          console.error('Error refreshing profile:', err);
        });
      }

      logger.userAction('Quiz Submitted', userInfo, {
        attemptId: attemptData.id,
        score,
        totalQuestions,
        quizId,
        coinsEarned: totalEarned,
        newStreak,
      });

      // Save mistakes using robust sync utility (runs in background, doesn't block UI)
      // Identify mistakes: questions where userAnswers[index] !== question.correctIndex
      const mistakesArray = questions
        .map((q, index) => {
          const userSelectedIndex = userAnswers[index];
          const correctIndex = q.correctIndex;
          
          // Mistake if user answered incorrectly (not null and not equal to correct)
          if (userSelectedIndex !== null && userSelectedIndex !== correctIndex) {
            return {
              user_id: user.id,
              question_id: q.id,
            };
          }
          return null;
        })
        .filter((mistake): mistake is { user_id: string; question_id: string | number } => mistake !== null);

      // CRUCIAL: Do NOT await this call. Let it run in the background.
      // Navigation happens immediately below, ensuring 100% instant UI.
      if (mistakesArray.length > 0) {
        saveMistakes(user.id, mistakesArray).catch((err: unknown) => {
          // This should rarely happen as saveMistakes handles its own errors
          console.error('Unexpected error in saveMistakes:', err);
          logger.error('Unexpected error saving mistakes', err);
        });
      }

      // Navigate to result screen immediately (mistakes sync in background)
      router.replace(`/(protected)/result?attemptId=${attemptData.id}`);
    } catch (err) {
      logger.error('Quiz submission error', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      Alert.alert('Error', errorMessage);
      setIsSubmitting(false);
    }
  };

  // Hide tab bar and header when quiz screen is active
  useEffect(() => {
    // Get parent tab navigator to hide tab bar and header
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        headerShown: false,
        tabBarStyle: { display: 'none' },
      });
    }

    // Restore tab bar and header when component unmounts
    return () => {
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.setOptions({
          headerShown: undefined,
          tabBarStyle: undefined,
        });
      }
    };
  }, [navigation]);

  // Reset userAnswers when questions change
  useEffect(() => {
    if (questions.length > 0) {
      setUserAnswers(new Array(questions.length).fill(null));
    }
  }, [questions.length]);

  // Debug: Log questions state
  useEffect(() => {
    console.log('Questions state updated:', {
      questionsCount: questions.length,
      questions: questions,
    });
  }, [questions]);

  const {
    currentQuestion,
    currentQuestionIndex,
    selectedOptionIndex,
    score,
    hasUserAnswered,
    isLastQuestion,
    progressPercentage,
    handleOptionSelect: originalHandleOptionSelect,
    handleNext: originalHandleNext,
    getOptionState,
  } = useQuizLogic({
    questions,
    onQuizComplete: () => {}, // We'll handle completion ourselves
    userInfo,
  });

  /**
   * Tracks user's selected option index for every question.
   * Updates the userAnswers state array when user selects an option.
   * Also updates the questions array with user_answer property for full context.
   * This data will be saved to the database as user_answers column when quiz is submitted.
   */
  const handleOptionSelect = (optionIndex: number) => {
    originalHandleOptionSelect(optionIndex);
    
    // Capture the selected option index (0-3) for the current question
    // Store in userAnswers array which will be saved to DB as user_answers column
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setUserAnswers(newAnswers);
    
    // Update questions array with user_answer property for full context
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      user_answer: optionIndex,
    };
    setQuestions(updatedQuestions);
  };

  /**
   * Handles navigation to next question or quiz submission.
   * Triggers handleFinish when user completes the last question.
   */
  const handleNext = () => {
    if (!hasUserAnswered) return;

    if (isLastQuestion) {
      // Trigger submission logic when completing last question
      handleFinish();
    } else {
      // Proceed to next question
      originalHandleNext();
    }
  };

  // Debug: Log current question
  useEffect(() => {
    console.log('Current question:', currentQuestion);
  }, [currentQuestion]);

  const handleBack = () => {
    Alert.alert(
      'Quit Quiz?',
      'Progress will be lost',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
      { cancelable: true }
    );
  };

  const handleReport = () => {
    console.log('Flag pressed');
    if (!session?.user || !currentQuestion) {
      return;
    }

    Alert.alert(
      'Report Question',
      'Why are you reporting this question?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Wrong Answer',
          onPress: () => submitReport('wrong_answer'),
        },
        {
          text: 'Offensive / Bad Content',
          onPress: () => submitReport('offensive'),
        },
      ],
      { cancelable: true }
    );
  };

  const submitReport = async (type: string) => {
    if (!session?.user || !currentQuestion) {
      return;
    }

    try {
      const { error } = await supabase
        .from('question_reports')
        .insert({
          user_id: session.user.id,
          question_text: currentQuestion.question,
          issue_type: type,
        });

      if (error) {
        console.error('Error reporting question:', error);
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      } else {
        setIsReported(true);
        Alert.alert('Thanks', 'We will review this.');
        logger.info('Question reported', {
          questionId: currentQuestion.id,
          issueType: type,
        });
      }
    } catch (err) {
      console.error('Unexpected error reporting question:', err);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Helper function to parse and make error messages user-friendly
  const getUserFriendlyError = (errorMessage: string): string => {
    // Handle technical Edge Function errors
    if (errorMessage.includes('non-2xx status code') || errorMessage.includes('Edge Function')) {
      return 'Oops! Our quiz generator is having trouble right now. Please try again in a moment.';
    }
    
    // Handle network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      return 'Connection issue detected. Please check your internet and try again.';
    }
    
    // Handle rate limit errors (should be caught earlier, but just in case)
    if (errorMessage.includes('Please wait') || errorMessage.includes('rate limit')) {
      return errorMessage; // Keep the friendly rate limit message
    }
    
    // Return original message if it's already user-friendly, otherwise provide generic message
    if (errorMessage.length < 100 && !errorMessage.includes('Error') && !errorMessage.includes('Failed')) {
      return errorMessage;
    }
    
    return 'Something went wrong while loading the quiz. Please try again.';
  };

  if (error) {
    const friendlyError = getUserFriendlyError(error);
    
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={[styles.centerContent, styles.errorContainer]}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF6B35" />
          </View>
          <Text style={styles.errorTitle}>Unable to Load Quiz</Text>
          <Text style={styles.errorText}>{friendlyError}</Text>
          
          {error.includes('non-2xx') && (
            <View style={styles.errorDetailsContainer}>
              <Text style={styles.errorDetailsText}>
                Technical details: {error}
              </Text>
            </View>
          )}
          
          <View style={styles.errorButtonContainer}>
            <TouchableOpacity
              style={[styles.errorButton, styles.errorButtonPrimary]}
              onPress={fetchQuiz}
            >
              <Ionicons name="refresh" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.errorButton, styles.errorButtonSecondary]}
              onPress={() => router.replace('/(protected)/dashboard')}
            >
              <Ionicons name="home" size={20} color="#FF6B35" style={{ marginRight: 8 }} />
              <Text style={[styles.errorButtonText, styles.errorButtonTextSecondary]}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No questions available</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Safety check: ensure currentQuestion exists
  if (!currentQuestion) {
    console.error('currentQuestion is undefined:', { questions, currentQuestionIndex });
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Error loading question. Please try again.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchQuiz}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('Rendering quiz UI with question:', currentQuestionIndex + 1, 'of', questions.length);

  // Calculate progress percentage for simple progress bar
  const currentProgressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Layer: Header */}
      <View style={styles.header}>
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${currentProgressPercentage}%` }]} />
        </View>

        {/* Report Button */}
        <TouchableOpacity
          onPress={handleReport}
          style={styles.reportButton}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons 
            name={isReported ? "flag" : "flag-outline"} 
            size={20} 
            color={isReported ? "#FF3B30" : "gray"} 
          />
        </TouchableOpacity>
      </View>

      {/* Middle Layer: Scrollable Content */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
      >
        <View style={styles.questionCard}>
          <DifficultyBadge difficulty={currentQuestion.difficulty} />
          <Text style={[styles.questionText, isMobile && styles.questionTextMobile]}>
            {currentQuestion.question}
          </Text>

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

          {hasUserAnswered && currentQuestion.explanation && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationTitle}>Explanation:</Text>
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Layer: Footer (Absolute Positioned) */}
      {selectedOptionIndex !== null && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!hasUserAnswered || isSubmitting) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!hasUserAnswered || isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.submittingContainer}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.submittingText}>Saving results...</Text>
              </View>
            ) : (
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
    elevation: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginRight: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF512F',
    borderRadius: 3,
  },
  reportButton: {
    padding: 8,
    zIndex: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  questionCard: {
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
    elevation: 3,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 32,
    marginTop: 16,
    marginBottom: 24,
  },
  questionTextMobile: {
    fontSize: 20,
  },
  optionsContainer: {
    gap: 12,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  nextButton: {
    backgroundColor: '#FF512F',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
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
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  submittingText: {
    color: '#ffffff',
    fontSize: 16,
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
  errorContainer: {
    padding: 24,
    maxWidth: 500,
    width: '100%',
  },
  errorIconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  errorDetailsContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    maxHeight: 100,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorButtonContainer: {
    width: '100%',
    gap: 12,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 52,
  },
  errorButtonPrimary: {
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorButtonTextSecondary: {
    color: '#FF6B35',
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

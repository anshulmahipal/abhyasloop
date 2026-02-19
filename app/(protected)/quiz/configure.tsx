import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { generateQuiz } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { getOrGenerateTest, getPendingMockTest } from '../../../services/examService';
import { MockTestInfoCard } from '../../../components/MockTestInfoCard';

interface MockTestAttempt {
  id: string;
  topic: string;
  score: number;
  total_questions: number;
  difficulty: string;
  created_at: string;
}

const DIFFICULTY_LEVELS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function parseTopics(topicsParam: string | undefined): string[] {
  if (!topicsParam) return [];
  try {
    const parsed = JSON.parse(topicsParam);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default function QuizConfigureScreen() {
  const params = useLocalSearchParams<{ title?: string; topics?: string; preselectedTopic?: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();

  const examTitle = params.title ?? 'Mock Test';
  const topics = parseTopics(params.topics);
  const preselected = params.preselectedTopic;

  const [selectedTopic, setSelectedTopic] = useState<string | null | undefined>(
    preselected ? preselected : undefined
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount] = useState<string>('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const buttonDisableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrorScreen, setShowErrorScreen] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingTestId, setPendingTestId] = useState<string | null>(null);
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [attempts, setAttempts] = useState<MockTestAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const currentFocus = profile?.current_focus ?? 'General Knowledge';

  const fetchAttempts = useCallback(async () => {
    if (!user) {
      setAttempts([]);
      return;
    }
    setLoadingAttempts(true);
    try {
      const { data, error } = await supabase
        .from('quiz_history')
        .select('id, topic, score, total_questions, difficulty, created_at')
        .eq('user_id', user.id)
        .eq('topic', examTitle)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        console.error('Error fetching mock test attempts:', error);
        setAttempts([]);
        return;
      }
      setAttempts((data ?? []) as MockTestAttempt[]);
    } catch {
      setAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  }, [user, examTitle]);

  useFocusEffect(
    useCallback(() => {
      fetchAttempts();
    }, [fetchAttempts])
  );

  useEffect(() => {
    return () => {
      if (buttonDisableTimeoutRef.current) clearTimeout(buttonDisableTimeoutRef.current);
    };
  }, []);

  const handleStartQuiz = async () => {
    if (selectedTopic === undefined) {
      Alert.alert('Select option', 'Please select Full Mock Test or a topic.');
      return;
    }

    if (selectedTopic === null) {
      if (user) {
        const pending = await getPendingMockTest(user.id, examTitle);
        if (pending) {
          router.push({
            pathname: '/(protected)/quiz/[id]',
            params: {
              id: pending.testId,
              topic: examTitle,
              difficulty: selectedDifficulty,
              examType: examTitle,
              fromMockTest: '1',
            },
          });
          return;
        }
      }
      router.push({
        pathname: '/(protected)/quiz/mock-test-generator',
        params: { difficulty: selectedDifficulty, examType: examTitle },
      });
      return;
    }

    setIsGenerating(true);
    setIsButtonDisabled(true);
    if (buttonDisableTimeoutRef.current) clearTimeout(buttonDisableTimeoutRef.current);
    buttonDisableTimeoutRef.current = setTimeout(() => {
      setIsButtonDisabled(false);
      buttonDisableTimeoutRef.current = null;
    }, 2000);

    const topicForQuiz = selectedTopic;
    try {
      if (user) {
        const result = await getOrGenerateTest(user.id, selectedTopic, selectedDifficulty);
        if (result.status === 'pending') {
          setPendingTestId(result.testId);
          setPendingTopic(topicForQuiz);
          setPendingMessage(result.message ?? 'You have an unfinished test.');
          setShowPendingModal(true);
          return;
        }
        router.push({
          pathname: '/(protected)/quiz/[id]',
          params: {
            id: result.testId,
            topic: topicForQuiz,
            difficulty: selectedDifficulty,
            examType: currentFocus,
            fromMockTest: '1',
          },
        });
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          subject: examTitle,
          topic: selectedTopic,
          difficulty: selectedDifficulty.toLowerCase(),
          userFocus: currentFocus.trim(),
          questionCount: parseInt(questionCount, 10),
        },
      });

      if (invokeError) throw new Error(invokeError.message ?? 'Failed to generate quiz');
      if (!data) throw new Error('No data returned');
      if (typeof data === 'object' && 'error' in data) {
        const err = data as { error?: string; details?: string };
        throw new Error(err.details ?? err.error ?? 'Failed to generate quiz');
      }
      if (!data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Invalid response from quiz service');
      }

      router.push({
        pathname: '/(protected)/quiz/[id]',
        params: {
          id: (data as { quizId: string }).quizId,
          topic: topicForQuiz,
          difficulty: selectedDifficulty,
          examType: currentFocus,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.';
      setError(msg);
      setShowErrorScreen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResumeTest = () => {
    if (!pendingTestId || !pendingTopic) return;
    setShowPendingModal(false);
    setPendingTestId(null);
    setPendingTopic(null);
    setPendingMessage('');
    router.push({
      pathname: '/(protected)/quiz/[id]',
      params: {
        id: pendingTestId,
        topic: pendingTopic,
        difficulty: selectedDifficulty,
        examType: currentFocus,
        fromMockTest: '1',
      },
    });
  };

  const renderTopicOption = (isFullMock: boolean, topicName?: string) => {
    const isSelected = isFullMock ? selectedTopic === null : selectedTopic === topicName;
    return (
      <TouchableOpacity
        key={isFullMock ? 'full' : topicName}
        style={[styles.topicChip, isFullMock && styles.topicChipFullMock, isSelected && styles.topicChipSelected]}
        onPress={() => setSelectedTopic(isFullMock ? null : topicName ?? null)}
        activeOpacity={0.8}
      >
        {isFullMock ? (
          <Text style={styles.topicChipEmoji}>🏆</Text>
        ) : null}
        <Text style={[styles.topicChipText, isSelected && styles.topicChipTextSelected]}>
          {isFullMock ? 'Full Mock Test' : topicName}
        </Text>
      </TouchableOpacity>
    );
  };

  if (showErrorScreen) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={56} color="#dc2626" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error ?? 'Please try again.'}</Text>
          <TouchableOpacity
            style={styles.errorPrimaryButton}
            onPress={() => { setShowErrorScreen(false); setError(null); }}
            activeOpacity={0.8}
          >
            <Text style={styles.errorPrimaryButtonText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.errorSecondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.errorSecondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{examTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Test type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Test type</Text>
          <View style={styles.topicRow}>
            {renderTopicOption(true)}
            {topics.map((t) => renderTopicOption(false, t))}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Difficulty</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTY_LEVELS.map((d) => {
              const isSelected = selectedDifficulty === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.difficultyChip, isSelected && styles.difficultyChipSelected]}
                  onPress={() => setSelectedDifficulty(d)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.difficultyChipText, isSelected && styles.difficultyChipTextSelected]}>
                    {DIFFICULTY_LABELS[d]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[
            styles.ctaButton,
            (selectedTopic === undefined || isGenerating || isButtonDisabled) && styles.ctaButtonDisabled,
          ]}
          onPress={handleStartQuiz}
          disabled={selectedTopic === undefined || isGenerating || isButtonDisabled}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.ctaButtonText}>
              {selectedTopic === null ? 'Generate Mock Test' : 'Start Mock Test'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Your mock test attempts (this exam only) */}
        <View style={styles.attemptsSection}>
          <Text style={styles.attemptsSectionLabel}>Your attempts</Text>
          {loadingAttempts ? (
            <View style={styles.attemptsLoading}>
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : attempts.length === 0 ? (
            <Text style={styles.attemptsEmpty}>No attempts yet for this exam.</Text>
          ) : (
            attempts.map((a) => {
              const dateStr = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <MockTestInfoCard
                  key={a.id}
                  title={examTitle}
                  score={a.score}
                  total={a.total_questions}
                  date={dateStr}
                  onPress={() => router.push(`/(protected)/history/${a.id}` as any)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Pending test modal */}
      <Modal visible={showPendingModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPendingModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Unfinished test</Text>
            <Text style={styles.modalMessage}>{pendingMessage}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleResumeTest}>
                <Text style={styles.modalButtonPrimaryText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowPendingModal(false);
                  setPendingTestId(null);
                  setPendingTopic(null);
                  setPendingMessage('');
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  attemptsSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  attemptsSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  attemptsLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  attemptsEmpty: {
    fontSize: 14,
    color: '#94a3b8',
  },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  topicChipFullMock: { backgroundColor: '#fef9c3', borderColor: '#fde047' },
  topicChipSelected: { borderColor: '#059669', backgroundColor: '#ecfdf5' },
  topicChipEmoji: { fontSize: 18 },
  topicChipText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  topicChipTextSelected: { color: '#059669' },
  difficultyRow: { flexDirection: 'row', gap: 10 },
  difficultyChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyChipSelected: { backgroundColor: '#ecfdf5', borderColor: '#059669' },
  difficultyChipText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  difficultyChipTextSelected: { color: '#059669' },
  ctaButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  ctaButtonDisabled: { backgroundColor: '#94a3b8', opacity: 0.9 },
  ctaButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  errorContainer: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  errorMessage: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8 },
  errorPrimaryButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#059669',
    borderRadius: 12,
  },
  errorPrimaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorSecondaryButton: { marginTop: 12, paddingVertical: 10 },
  errorSecondaryButtonText: { color: '#64748b', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  modalMessage: { fontSize: 15, color: '#64748b', marginBottom: 20 },
  modalActions: { gap: 12 },
  modalButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonPrimary: { backgroundColor: '#059669' },
  modalButtonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalButtonSecondary: { backgroundColor: '#f1f5f9' },
  modalButtonSecondaryText: { color: '#475569', fontSize: 16, fontWeight: '600' },
});

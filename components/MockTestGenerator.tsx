import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  saveMergedMockTest,
  invokeGenerateExam,
  deleteMockTestsByIds,
} from '../services/examService';

// Theme
const theme = {
  bg: '#f0f4f8',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  primary: '#059669',
  primaryLight: '#d1fae5',
  loading: '#0ea5e9',
  loadingTrack: '#e0f2fe',
  success: '#059669',
  error: '#ea580c',
  errorBg: '#fff7ed',
  text: '#1e293b',
  textMuted: '#64748b',
};

const SECTIONS = ['Physics', 'Chemistry', 'Math', 'GK'] as const;
type SectionKey = (typeof SECTIONS)[number];

type SectionStatus = 'idle' | 'loading' | 'success' | 'error';

interface SectionState {
  status: SectionStatus;
  data: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    difficulty: string;
    explanation?: string;
  }> | null;
  /** Temp mock_tests id from generate-exam; deleted after merge */
  testId?: string;
}

const initialSectionState = (): SectionState => ({
  status: 'idle',
  data: null,
});

function buildInitialSectionsStatus(): Record<SectionKey, SectionState> {
  return SECTIONS.reduce(
    (acc, key) => {
      acc[key] = initialSectionState();
      return acc;
    },
    {} as Record<SectionKey, SectionState>
  );
}

const RETRY_DELAY_MS = 2000;
const QUESTIONS_PER_SECTION = 10; // generate-exam returns 10 per section

interface MockTestGeneratorProps {
  difficulty: 'easy' | 'medium' | 'hard';
  userFocus?: string;
  examType?: string;
  onStart?: () => void;
}

export function MockTestGenerator({
  difficulty,
  userFocus = 'General Knowledge',
  examType = 'Full Mock Test',
  onStart,
}: MockTestGeneratorProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [sectionsStatus, setSectionsStatus] = useState<Record<SectionKey, SectionState>>(
    buildInitialSectionsStatus
  );
  const [queueRunning, setQueueRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasAutoStarted = useRef(false);

  const fetchTestFromAI = useCallback(
    async (section: string) => {
      const { id, questions } = await invokeGenerateExam(section, difficulty);
      return { testId: id, questions };
    },
    [difficulty]
  );

  const processQueue = useCallback(
    async (sectionsToGenerate: SectionKey[]) => {
      setQueueRunning(true);
      let queue = [...sectionsToGenerate];

      while (queue.length > 0) {
        const section = queue.shift()!;

        setSectionsStatus((prev) => ({
          ...prev,
          [section]: { status: 'loading', data: null },
        }));

        try {
          const { testId, questions } = await fetchTestFromAI(section);
          const q = questions as Array<{ id?: string; question?: string; options?: string[]; correctIndex?: number; difficulty?: string; explanation?: string }>;
          const minified = q.map((item, i) => ({
            id: item.id ?? `q-${i + 1}`,
            question: String(item.question ?? ''),
            options: Array.isArray(item.options) ? item.options : [],
            correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
            difficulty: String(item.difficulty ?? difficulty),
            explanation: item.explanation ?? '',
          }));

          setSectionsStatus((prev) => ({
            ...prev,
            [section]: { status: 'success', data: minified, testId },
          }));
        } catch (err) {
          console.warn(`MockTestGenerator: ${section} failed, will retry`, err);
          setSectionsStatus((prev) => ({
            ...prev,
            [section]: { status: 'error', data: null },
          }));
          queue.push(section);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }

      setQueueRunning(false);
    },
    [fetchTestFromAI]
  );

  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    processQueue([...SECTIONS]);
  }, [processQueue]);

  const allSuccess = Object.values(sectionsStatus).every((s) => s.status === 'success');

  const handleAttemptTest = useCallback(async () => {
    if (!allSuccess) return;

    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in to save and attempt the test.'
      );
      return;
    }

    const allData = Object.values(sectionsStatus)
      .filter((s): s is SectionState & { data: NonNullable<SectionState['data']> } => s.data != null)
      .flatMap((s) => s.data);

    if (allData.length === 0) {
      Alert.alert('Error', 'No questions to attempt.');
      return;
    }

    setSubmitting(true);
    try {
      const tempTestIds = Object.values(sectionsStatus)
        .map((s) => s.testId)
        .filter((id): id is string => Boolean(id));

      const testId = await saveMergedMockTest({
        userId: user.id,
        topic: examType,
        questions: allData,
        title: `Full Mock Test – ${difficulty}`,
      });

      await deleteMockTestsByIds(tempTestIds);

      onStart?.();
      const topicEnc = encodeURIComponent(examType);
      router.replace(
        `/(protected)/quiz/${testId}?topic=${topicEnc}&difficulty=${difficulty}&examType=${topicEnc}&fromMockTest=1`
      );
    } catch (err) {
      console.error('MockTestGenerator: save failed', err);
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Could not save mock test. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [allSuccess, user, sectionsStatus, examType, difficulty, onStart, router]);

  return (
    <View style={styles.container}>
      <View style={styles.horizontalStrip}>
        {SECTIONS.map((key) => (
          <SectionRow
            key={key}
            label={key}
            state={sectionsStatus[key]}
            questionCount={sectionsStatus[key].data?.length ?? QUESTIONS_PER_SECTION}
          />
        ))}
      </View>

      {allSuccess && (
        <TouchableOpacity
          style={styles.attemptButton}
          onPress={handleAttemptTest}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.attemptButtonText}>Attempt Test</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

function SectionRow({ label, state, questionCount }: { label: string; state: SectionState; questionCount: number }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state.status !== 'loading') {
      fillAnim.setValue(0);
      return;
    }
    let cancelled = false;
    const run = () => {
      fillAnim.setValue(0);
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !cancelled) run();
      });
    };
    run();
    return () => {
      cancelled = true;
      fillAnim.stopAnimation();
    };
  }, [state.status]);

  const widthInterpolate = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[
      styles.sectionRow,
      state.status === 'success' && styles.sectionRowSuccess,
      state.status === 'error' && styles.sectionRowError,
    ]}>
      <View style={styles.sectionRowContent}>
        <Text style={styles.sectionRowLabel}>{label}</Text>
        <Text style={styles.sectionRowCount}>{questionCount} Q</Text>
        {state.status === 'success' && <Check size={18} color={theme.success} strokeWidth={2.5} style={styles.sectionRowIcon} />}
        {state.status === 'error' && (
          <>
            <AlertTriangle size={18} color={theme.error} strokeWidth={2} style={styles.sectionRowIcon} />
            <Text style={styles.retryHint}>Retry</Text>
          </>
        )}
      </View>
      {state.status === 'loading' && (
        <View style={styles.fillTrack}>
          <Animated.View style={[styles.fillBar, { width: widthInterpolate }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.bg,
  },
  horizontalStrip: {
    marginTop: 16,
    gap: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    overflow: 'hidden',
    minHeight: 48,
  },
  sectionRowSuccess: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  sectionRowError: {
    borderColor: theme.error,
    backgroundColor: theme.errorBg,
  },
  sectionRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionRowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    minWidth: 80,
  },
  sectionRowCount: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textMuted,
  },
  sectionRowIcon: {
    marginLeft: 4,
  },
  fillTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: theme.loadingTrack,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    backgroundColor: theme.loading,
  },
  retryHint: {
    fontSize: 11,
    color: theme.error,
    fontWeight: '600',
  },
  attemptButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  attemptButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

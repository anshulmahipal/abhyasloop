import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { EXAM_CATEGORIES } from '../../constants/exams';
import { posthog } from '../../lib/posthog';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, user, refreshProfile, loading: authLoading } = useAuth();
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // If user already has goals, skip to dashboard
  useEffect(() => {
    if (authLoading || !profile) return;
    const hasGoals = profile.target_exams && profile.target_exams.length > 0;
    if (hasGoals) {
      router.replace('/(protected)/dashboard');
    }
  }, [profile, authLoading, router]);

  // Show loading while waiting for profile (needed to decide: redirect or show selector)
  if (authLoading || (user && !profile)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const toggleExam = (exam: string) => {
    setSelectedExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const handleContinue = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to continue.');
      return;
    }
    if (selectedExams.length === 0) {
      Alert.alert('Select at least one', 'Please select at least one exam you\'re preparing for.');
      return;
    }

    try {
      setIsSaving(true);
      const updateData = {
        target_exams: selectedExams,
        current_focus: selectedExams[0],
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error saving goals:', error);
        Alert.alert('Error', 'Failed to save. Please try again.');
        return;
      }

      await refreshProfile();

      posthog.capture('onboarding_goals_completed', {
        target_exams: selectedExams,
        exam_count: selectedExams.length,
      });

      router.replace('/(protected)/dashboard');
    } catch (err) {
      console.error('Failed to save goals:', err);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderExamSection = (category: (typeof EXAM_CATEGORIES)[0]) => (
    <View key={category.id} style={styles.sectionWrapper}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{category.name}</Text>
      </View>
      <View style={styles.chipsRow}>
        {category.exams.map((exam) => {
          const isSelected = selectedExams.includes(exam);
          return (
            <TouchableOpacity
              key={exam}
              style={[styles.examChip, isSelected && styles.examChipSelected]}
              onPress={() => toggleExam(exam)}
              activeOpacity={0.7}
            >
              <Text style={[styles.examChipText, isSelected && styles.examChipTextSelected]}>
                {exam}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          <Text style={styles.title}>Welcome! 👋</Text>
          <Text style={styles.subtitle}>
            Select the exams you're preparing for. You can change this anytime from your dashboard.
          </Text>

          <View style={styles.listContent}>
            {EXAM_CATEGORIES.map(renderExamSection)}
          </View>

          <TouchableOpacity
            style={[styles.continueButton, isSaving && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  scrollContentMobile: {
    paddingHorizontal: 20,
  },
  contentWrapper: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionWrapper: {
    marginBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  examChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  examChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  examChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  examChipTextSelected: {
    color: '#ffffff',
  },
  continueButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

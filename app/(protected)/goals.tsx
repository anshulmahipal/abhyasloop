import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { EXAM_CATEGORIES } from '../../constants/exams';
import { posthog } from '../../lib/posthog';

interface SectionData {
  title: string;
  data: string[];
}

export default function GoalsScreen() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const exams = (profile?.target_exams && profile.target_exams.length > 0)
      ? profile.target_exams
      : [];
    setSelectedExams(exams);
  }, [profile?.target_exams]);

  const toggleSelection = (examId: string) => {
    setSelectedExams((prev) =>
      prev.includes(examId) ? prev.filter((e) => e !== examId) : [...prev, examId]
    );
  };

  const handleCancel = () => {
    router.replace('/(protected)/dashboard');
  };

  const updateUserGoals = async (exams: string[]) => {
    if (!user) return { error: new Error('Not signed in') };
    const currentFocusValue = profile?.current_focus || null;
    const newFocus =
      exams.length > 0
        ? exams.includes(currentFocusValue || '')
          ? currentFocusValue
          : exams[0]
        : null;
    const updateData: { target_exams: string[]; current_focus?: string | null } = {
      target_exams: exams,
    };
    if (newFocus !== currentFocusValue) {
      updateData.current_focus = newFocus;
    }
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);
    if (error) return { error };
    await refreshProfile();
    posthog.capture('goals_updated', {
      target_exams: exams,
      exam_count: exams.length,
    });
    return { error: null };
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to save your goals.');
      return;
    }
    if (selectedExams.length === 0) return;
    setIsSaving(true);
    try {
      const { error } = await updateUserGoals(selectedExams);
      if (error) {
        console.error('Error saving target_exams:', error);
        Alert.alert('Error', 'Failed to save goals. Please try again.');
        return;
      }
      router.replace('/(protected)/dashboard');
    } catch (err) {
      console.error('Goals save error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sections: SectionData[] = EXAM_CATEGORIES.map((category) => ({
    title: category.name,
    data: [category.exams],
  }));

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: string[] }) => (
    <View style={styles.itemContainer}>
      {item.map((examId) => {
        const isSelected = selectedExams.includes(examId);
        return (
          <TouchableOpacity
            key={examId}
            style={[
              styles.examCard,
              isSelected ? styles.examCardSelected : styles.examCardUnselected,
            ]}
            onPress={() => toggleSelection(examId)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.examCardText, isSelected && styles.examCardTextSelected]}
              numberOfLines={2}
            >
              {examId}
            </Text>
            {isSelected && (
              <View style={styles.checkmarkWrap}>
                <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          disabled={isSaving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Your Target Exams</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.subtitle}>Choose all exams you're preparing for</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `section-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButtonPrimary,
            (selectedExams.length === 0 || isSaving) && styles.saveButtonPrimaryDisabled,
          ]}
          onPress={handleSave}
          disabled={selectedExams.length === 0 || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonPrimaryText}>
              {selectedExams.length > 0
                ? `Save ${selectedExams.length} Goal(s)`
                : 'Select a target exam'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemContainer: {
    marginBottom: 12,
    gap: 10,
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
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  examCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
  },
  examCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#22C55E',
  },
  examCardText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  examCardTextSelected: {
    color: '#166534',
  },
  checkmarkWrap: {
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonPrimary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPrimaryDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.8,
  },
  saveButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});

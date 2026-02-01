import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { EXAM_CATEGORIES } from '../constants/exams';

interface GoalSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (selectedExams: string[]) => void;
}

interface SectionData {
  title: string;
  data: string[];
}

export function GoalSelectorModal({ visible, onClose, onSave }: GoalSelectorModalProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize selected exams from profile
  useEffect(() => {
    if (profile && visible) {
      const targetExams = profile.target_exams || [];
      setSelectedExams(targetExams);
      setIsLoading(false);
    } else if (!profile && visible) {
      setIsLoading(false);
    }
  }, [profile, visible]);

  const toggleExam = (exam: string) => {
    setSelectedExams((prev) => {
      if (prev.includes(exam)) {
        return prev.filter((e) => e !== exam);
      } else {
        return [...prev, exam];
      }
    });
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to save your goals.');
      return;
    }

    if (selectedExams.length === 0) {
      Alert.alert('No Selection', 'Please select at least one exam.');
      return;
    }

    try {
      setIsSaving(true);

      const updateData = {
        target_exams: selectedExams,
        current_focus: selectedExams[0] || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error saving target_exams:', error);
        Alert.alert('Error', 'Failed to save goals. Please try again.');
        return;
      }

      // Refresh profile to get updated data
      await refreshProfile();

      // Call optional callback
      if (onSave) {
        onSave(selectedExams);
      }

      Alert.alert('Success', 'Your goals have been saved!');
      onClose();
    } catch (err) {
      console.error('Failed to save goals:', err);
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Transform EXAM_CATEGORIES into SectionList format
  const sections: SectionData[] = EXAM_CATEGORIES.map((category) => ({
    title: category.name,
    data: category.exams,
  }));

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderExamItem = ({ item }: { item: string }) => {
    const isSelected = selectedExams.includes(item);
    return (
      <TouchableOpacity
        style={[styles.examChip, isSelected && styles.examChipSelected]}
        onPress={() => toggleExam(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.examChipText, isSelected && styles.examChipTextSelected]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Your Target Exams</Text>
            <Text style={styles.subtitle}>Choose all exams you're preparing for</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF6B35" />
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={renderExamItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Goals</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  examChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  examChipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  examChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  examChipTextSelected: {
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

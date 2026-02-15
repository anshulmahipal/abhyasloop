import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SectionList,
  Pressable,
} from 'react-native';
import { EXAM_CATEGORIES } from '../constants/exams';

interface GoalSelectorProps {
  visible: boolean;
  onClose: () => void;
  initialSelection?: string[];
  onSave: (selectedExams: string[]) => void;
}

interface SectionData {
  title: string;
  data: string[];
}

export function GoalSelector({ visible, onClose, initialSelection = [], onSave }: GoalSelectorProps) {
  const [selectedExams, setSelectedExams] = useState<string[]>(initialSelection);

  // Update local state when initialSelection changes
  useEffect(() => {
    setSelectedExams(initialSelection);
  }, [initialSelection, visible]);

  const toggleExam = (exam: string) => {
    setSelectedExams((prev) => {
      if (prev.includes(exam)) {
        return prev.filter((e) => e !== exam);
      } else {
        return [...prev, exam];
      }
    });
  };

  const handleSave = () => {
    onSave(selectedExams);
    onClose();
  };

  // Transform EXAM_CATEGORIES into SectionList format
  // Each section has a single item that contains all exams for that category
  const sections: SectionData[] = EXAM_CATEGORIES.map((category) => ({
    title: category.name,
    data: [category.exams], // Wrap exams array in an array so SectionList treats it as one item
  }));

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: string[] }) => {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.chipsRow}>
          {item.map((exam) => {
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
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable style={styles.handleBarContainer} onPress={onClose}>
              <View style={styles.handleBar} />
            </Pressable>
            <Text style={styles.title}>Select Your Target Exams</Text>
            <Text style={styles.subtitle}>Choose all exams you're preparing for</Text>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item, index) => `section-${index}`}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={true}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save Goals</Text>
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  handleBarContainer: {
    paddingVertical: 8,
    paddingHorizontal: '50%',
    marginBottom: 8,
    alignSelf: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemContainer: {
    marginBottom: 16,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
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
    elevation: 8,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#059669',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

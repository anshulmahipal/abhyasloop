import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const AVAILABLE_EXAMS = ['SSC', 'Banking', 'Railways', 'Defence'];

interface GoalSelectorProps {
  onSave?: (selectedExams: string[]) => void;
}

export function GoalSelector({ onSave }: GoalSelectorProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize selected exams from profile
  useEffect(() => {
    if (profile) {
      const targetExams = profile.target_exams || [];
      setSelectedExams(targetExams);
      setIsLoading(false);
    }
  }, [profile]);

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

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ target_exams: selectedExams })
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
    } catch (err) {
      console.error('Failed to save goals:', err);
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Target Exams</Text>
      <Text style={styles.subtitle}>Choose all exams you're preparing for</Text>

      <View style={styles.chipsContainer}>
        {AVAILABLE_EXAMS.map((exam) => {
          const isSelected = selectedExams.includes(exam);
          return (
            <TouchableOpacity
              key={exam}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleExam(exam)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {exam}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#007AFF',
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
});

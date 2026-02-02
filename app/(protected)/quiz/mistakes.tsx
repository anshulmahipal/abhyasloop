import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';

interface MistakeWithQuestion {
  id: string; // mistake id
  question_id: string;
  user_id: string;
  created_at: string;
  questions: {
    id: string;
    question_text: string;
    options: string[];
    correct_index: number;
    explanation: string | null;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string | null;
  };
}

export default function MistakesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [mistakes, setMistakes] = useState<MistakeWithQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [archivingIds, setArchivingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchMistakes();
    }
  }, [user]);

  const fetchMistakes = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch mistakes joined with questions
      const { data, error: fetchError } = await supabase
        .from('mistakes')
        .select('*, questions(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching mistakes:', fetchError);
        logger.error('Failed to fetch mistakes', fetchError);
        throw new Error('Failed to load your mistakes');
      }

      // Filter out any mistakes where question data is missing
      // Also ensure options is parsed correctly (it's stored as JSONB)
      const validMistakes = (data || []).filter(
        (mistake: any) => mistake.questions !== null
      ).map((mistake: any) => {
        // Ensure options is an array (JSONB might be stringified)
        if (mistake.questions && typeof mistake.questions.options === 'string') {
          try {
            mistake.questions.options = JSON.parse(mistake.questions.options);
          } catch (e) {
            console.error('Error parsing options JSON:', e);
          }
        }
        return mistake;
      }) as MistakeWithQuestion[];

      setMistakes(validMistakes);
    } catch (err) {
      logger.error('Failed to load mistakes', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to load mistakes. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCard = (mistakeId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mistakeId)) {
        newSet.delete(mistakeId);
      } else {
        newSet.add(mistakeId);
      }
      return newSet;
    });
  };

  const handleArchive = async (mistakeId: string, questionText: string) => {
    if (archivingIds.has(mistakeId)) return; // Prevent double-clicks

    // Store the mistake in case we need to revert
    const mistakeToRemove = mistakes.find((m) => m.id === mistakeId);
    if (!mistakeToRemove) return;

    try {
      setArchivingIds((prev) => new Set(prev).add(mistakeId));

      // OPTIMISTIC UPDATE: Remove from UI immediately
      setMistakes((prev) => prev.filter((m) => m.id !== mistakeId));
      setExpandedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mistakeId);
        return newSet;
      });

      // Delete mistake from database
      const { error: deleteError } = await supabase
        .from('mistakes')
        .delete()
        .eq('id', mistakeId);

      if (deleteError) {
        console.error('Error archiving mistake:', deleteError);
        logger.error('Failed to archive mistake', deleteError);
        
        // Revert optimistic update on error
        setMistakes((prev) => {
          const newMistakes = [...prev];
          // Insert back at the original position (maintain order)
          const insertIndex = mistakes.findIndex((m) => m.id === mistakeId);
          if (insertIndex >= 0) {
            newMistakes.splice(insertIndex, 0, mistakeToRemove);
          } else {
            newMistakes.push(mistakeToRemove);
          }
          return newMistakes;
        });
        
        Alert.alert('Error', 'Failed to archive mistake. Please try again.');
        setArchivingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(mistakeId);
          return newSet;
        });
        return;
      }

      logger.userAction('Mistake Archived', {
        mistakeId,
        questionText: questionText.substring(0, 50),
      }, {});

      // Show success toast
      Alert.alert('Mistake cleared!', '', [{ text: 'OK' }]);
    } catch (err) {
      console.error('Unexpected error archiving mistake:', err);
      logger.error('Unexpected error archiving mistake', err);
      
      // Revert optimistic update on error
      setMistakes((prev) => {
        const newMistakes = [...prev];
        const insertIndex = mistakes.findIndex((m) => m.id === mistakeId);
        if (insertIndex >= 0) {
          newMistakes.splice(insertIndex, 0, mistakeToRemove);
        } else {
          newMistakes.push(mistakeToRemove);
        }
        return newMistakes;
      });
      
      Alert.alert('Error', 'Failed to archive mistake. Please try again.');
      setArchivingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mistakeId);
        return newSet;
      });
    }
  };

  const renderMistakeCard = ({ item }: { item: MistakeWithQuestion }) => {
    const isExpanded = expandedCards.has(item.id);
    const isArchiving = archivingIds.has(item.id);
    const question = item.questions;
    const correctAnswer = question.options[question.correct_index];
    const optionLabel = (index: number) => String.fromCharCode(65 + index);
    const topic = question.topic || 'General';

    return (
      <View style={styles.card}>
        {/* Collapsed View - Default */}
        {!isExpanded && (
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleCard(item.id)}
            activeOpacity={0.7}
            disabled={isArchiving}
          >
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={styles.questionPreview}>
                <View style={styles.topicBadgeContainer}>
                  <View style={styles.topicBadge}>
                    <Text style={styles.topicBadgeText}>{topic}</Text>
                  </View>
                </View>
                <Text 
                  style={styles.questionPreviewText}
                  numberOfLines={2}
                >
                  {question.question_text}
                </Text>
                <Text style={styles.tapToReviewText}>Tap to Review</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Expanded Content - Study Mode */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <TouchableOpacity
              style={styles.expandHeader}
              onPress={() => toggleCard(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-up" size={24} color="#666" />
            </TouchableOpacity>

            <View style={styles.questionSection}>
              <Text style={styles.questionText}>{question.question_text}</Text>
            </View>

            {/* Correct Answer - Prominently Displayed */}
            <View style={styles.correctAnswerSection}>
              <Text style={styles.correctAnswerLabel}>Correct Answer:</Text>
              <View style={styles.correctAnswerBox}>
                <Text style={styles.correctAnswerText}>
                  {optionLabel(question.correct_index)}. {correctAnswer}
                </Text>
              </View>
            </View>

            {question.explanation && (
              <View style={styles.explanationSection}>
                <Text style={styles.explanationLabel}>Explanation:</Text>
                <Text style={styles.explanationText}>{question.explanation}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.archiveButton, isArchiving && styles.archiveButtonDisabled]}
              onPress={() => handleArchive(item.id, question.question_text)}
              disabled={isArchiving}
              activeOpacity={0.8}
            >
              {isArchiving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.archiveButtonIcon}>✅</Text>
                  <Text style={styles.archiveButtonText}>I Mastered This</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🏆</Text>
      <Text style={styles.emptyStateText}>
        No weak spots found! You are ready for the next challenge.
      </Text>
    </View>
  );

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mistake Vault 🔐</Text>
          <Text style={styles.headerSubtitle}>
            Clear these to boost your score.
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your mistakes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchMistakes}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {mistakes.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={mistakes}
          renderItem={renderMistakeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  questionPreview: {
    flex: 1,
  },
  topicBadgeContainer: {
    marginBottom: 8,
  },
  topicBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#667EEA',
  },
  topicBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  questionPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 4,
  },
  tapToReviewText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  expandHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  questionSection: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 26,
  },
  correctAnswerSection: {
    marginBottom: 24,
  },
  correctAnswerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
  },
  correctAnswerBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
  },
  correctAnswerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    lineHeight: 24,
  },
  explanationSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    gap: 8,
  },
  archiveButtonDisabled: {
    opacity: 0.6,
  },
  archiveButtonIcon: {
    fontSize: 20,
  },
  archiveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },
});

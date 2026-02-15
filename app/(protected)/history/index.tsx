import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { useAuth } from '../../../contexts/AuthContext';

interface QuizAttemptWithQuiz {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  generated_quizzes: {
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
  } | null;
}

// Format date as "Today", "2 Feb", etc.
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [historyItems, setHistoryItems] = useState<QuizAttemptWithQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch quiz attempts with joined quiz data (same as Dashboard)
      const { data, error: fetchError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          generated_quizzes (
            topic,
            difficulty
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching quiz history:', fetchError);
        logger.error('Failed to fetch quiz history', fetchError);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to load quiz history';
        if (fetchError.code === 'PGRST116') {
          errorMessage = 'No quiz history found';
        } else if (fetchError.message?.includes('network') || fetchError.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (fetchError.message?.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (fetchError.message) {
          errorMessage = `Error: ${fetchError.message}`;
        }
        
        throw new Error(errorMessage);
      }

      // Handle case where data is null or undefined
      if (!data) {
        setHistoryItems([]);
        logger.info('Quiz history loaded', { count: 0 });
        return;
      }

      setHistoryItems(data as QuizAttemptWithQuiz[]);
      logger.info('Quiz history loaded', { count: data.length });
    } catch (err) {
      logger.error('Failed to load quiz history', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to load quiz history. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const getScoreBadgeStyle = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage > 70) {
      return {
        backgroundColor: '#E8F5E9',
        textColor: '#2E7D32',
      };
    } else if (percentage < 40) {
      return {
        backgroundColor: '#FFEBEE',
        textColor: '#C62828',
      };
    } else {
      return {
        backgroundColor: '#FFF3E0',
        textColor: '#E65100',
      };
    }
  };

  const renderHistoryItem = ({ item, index }: { item: QuizAttemptWithQuiz; index: number }) => {
    const topic = item.generated_quizzes?.topic || 'Unknown Topic';
    const difficulty = item.generated_quizzes?.difficulty || 'medium';
    const badgeStyle = getScoreBadgeStyle(item.score, item.total_questions);
    const percentage = Math.round((item.score / item.total_questions) * 100);
    const isLastItem = index === historyItems.length - 1;

    return (
      <TouchableOpacity
        style={[styles.card, isLastItem && styles.cardLast]}
        onPress={() => router.push(`/(protected)/quiz/review/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Row 1: Topic Name and Date */}
        <View style={styles.row1}>
          <Text style={styles.topicText}>{topic}</Text>
          <Text style={styles.dateText}>{formatDate(item.completed_at)}</Text>
        </View>

        {/* Row 2: Score Badge and Difficulty */}
        <View style={styles.row2}>
          <View style={[styles.scoreBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
            <Text style={[styles.scoreText, { color: badgeStyle.textColor }]}>
              {percentage}%
            </Text>
          </View>
          <Text style={styles.difficultyText}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={60} color="#999" />
      <Text style={styles.emptyStateText}>
        No quizzes yet. Start your streak!
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => router.push('/(protected)/quiz')}
        activeOpacity={0.7}
      >
        <Text style={styles.emptyStateButtonText}>Take a Quiz</Text>
      </TouchableOpacity>
    </View>
  );


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz History</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#059669" />
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Text style={styles.errorSubtext}>
            We couldn't load your quiz history. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchHistory}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : historyItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={historyItems}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLast: {
    marginBottom: 0,
  },
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#999',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyText: {
    fontSize: 14,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

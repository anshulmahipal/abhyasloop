import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface AppFeedback {
  id: string;
  user_id: string;
  category: 'bug' | 'feature' | 'general';
  message: string;
  status: 'pending' | 'resolved';
  admin_reply?: string | null;
  created_at: string;
}

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get category label
const getCategoryLabel = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export default function FeedbackDetailPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [feedback, setFeedback] = useState<AppFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id && user) {
      fetchFeedback();
    }
  }, [params.id, user]);

  const fetchFeedback = async () => {
    if (!params.id || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('app_feedback')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching feedback:', fetchError);
        throw new Error('Failed to load feedback');
      }

      if (!data) {
        throw new Error('Feedback not found');
      }

      setFeedback(data as AppFeedback);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to load feedback. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
          <Text style={styles.headerTitle}>Feedback Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !feedback) {
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
          <Text style={styles.headerTitle}>Feedback Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#059669" />
          <Text style={styles.errorText}>⚠️ {error || 'Feedback not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchFeedback}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = feedback.status === 'resolved' ? '#4CAF50' : '#FFC107';
  const statusText = feedback.status === 'resolved' ? 'RESOLVED' : 'PENDING';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBannerText}>Status: {statusText}</Text>
        </View>

        {/* User Message Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            You wrote on {formatDate(feedback.created_at)}:
          </Text>
          <View style={styles.userBubble}>
            <View style={styles.bubbleHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {getCategoryLabel(feedback.category)}
                </Text>
              </View>
            </View>
            <Text style={styles.bubbleText}>{feedback.message}</Text>
          </View>
        </View>

        {/* Admin Reply Section */}
        {feedback.admin_reply && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Admin Response:</Text>
            <View style={styles.adminBubble}>
              <Text style={styles.bubbleText}>{feedback.admin_reply}</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 24,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBanner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  adminBubble: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  bubbleHeader: {
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  bubbleText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
  },
});

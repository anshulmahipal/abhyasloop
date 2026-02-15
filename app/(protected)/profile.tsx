import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, processColor, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Badge {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
  unlocked: boolean;
}

interface QuizResult {
  score: number;
  total_questions: number;
  created_at?: string;
  completed_at?: string;
}

export default function ProfilePage() {
  const { profile, user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [isLoadingRank, setIsLoadingRank] = useState(true);
  const [memberSince, setMemberSince] = useState<string>('');
  const [chartData, setChartData] = useState<Array<{ value: number }>>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  
  // Calculate chart width using Dimensions
  const chartWidth = Dimensions.get('window').width - 60;

  // Calculate member since year from user creation date
  useEffect(() => {
    if (user?.created_at) {
      const createdDate = new Date(user.created_at);
      setMemberSince(createdDate.getFullYear().toString());
    }
  }, [user]);

  // Fetch global rank
  useEffect(() => {
    const fetchRank = async () => {
      if (!user || !profile) {
        setIsLoadingRank(false);
        return;
      }

      try {
        setIsLoadingRank(true);
        // Count users with more coins than current user
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('coins', profile.coins || 0);

        if (error) {
          console.error('Error fetching rank:', error);
          setGlobalRank(null);
        } else {
          // Rank = count of users with more coins + 1
          setGlobalRank((count || 0) + 1);
        }
      } catch (err) {
        console.error('Failed to fetch rank:', err);
        setGlobalRank(null);
      } finally {
        setIsLoadingRank(false);
      }
    };

    if (!authLoading && user && profile) {
      fetchRank();
    }
  }, [user, profile, authLoading]);

  // Fetch quiz results for performance chart
  useEffect(() => {
    const fetchQuizResults = async () => {
      if (!session?.user) {
        setIsLoadingChart(false);
        return;
      }

      try {
        setIsLoadingChart(true);
        // Try to fetch from 'results' table first, fallback to 'quiz_attempts'
        let data, error;
        
        // Try results table first with created_at
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select('score, total_questions, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true })
          .limit(10);

        if (!resultsError && resultsData) {
          // Use results table data
          data = resultsData;
          error = null;
        } else {
          // Fallback to quiz_attempts table with completed_at
          const attemptQuery = await supabase
            .from('quiz_attempts')
            .select('score, total_questions, completed_at')
            .eq('user_id', session.user.id)
            .order('completed_at', { ascending: true })
            .limit(10);
          data = attemptQuery.data;
          error = attemptQuery.error;
        }

        if (error) {
          console.error('Error fetching quiz results:', error);
          setChartData([]);
        } else if (data && data.length > 0) {
          // Transform data: calculate percentage for each quiz
          // Format: { value: number } where value = (score / total_questions) * 100
          const transformed = data.map((item: QuizResult) => ({
            value: (item.score / item.total_questions) * 100,
          }));
          setChartData(transformed);
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error('Failed to fetch quiz results:', err);
        setChartData([]);
      } finally {
        setIsLoadingChart(false);
      }
    };

    if (!authLoading && session?.user) {
      fetchQuizResults();
    }
  }, [session, authLoading]);

  const coins = profile?.coins || 0;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const currentFocus = profile?.current_focus || 'Not Set';
  const avatarUrl = profile?.avatar_url;

  // Define badges
  const badges: Badge[] = [
    { id: 'bronze', name: 'Bronze', emoji: '🥉', threshold: 100, unlocked: coins >= 100 },
    { id: 'silver', name: 'Silver', emoji: '🥈', threshold: 500, unlocked: coins >= 500 },
    { id: 'gold', name: 'Gold', emoji: '🥇', threshold: 1000, unlocked: coins >= 1000 },
    { id: 'platinum', name: 'Platinum', emoji: '💎', threshold: 5000, unlocked: coins >= 5000 },
  ];

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={60} color="#059669" />
              </View>
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{displayName}</Text>
            <TouchableOpacity
              onPress={() => router.push('/(protected)/profile/edit')}
              activeOpacity={0.7}
              style={styles.editIconButton}
            >
              <Ionicons name="pencil" size={18} color="#059669" />
            </TouchableOpacity>
          </View>
          {memberSince && (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(protected)/profile/wallet')}
            activeOpacity={0.8}
          >
            <Text 
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {coins.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Coins</Text>
            <Ionicons name="wallet" size={24} color="#059669" style={styles.statIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(protected)/leaderboard')}
            activeOpacity={0.8}
          >
            {isLoadingRank ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Text 
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                #{globalRank || '—'}
              </Text>
            )}
            <Text style={styles.statLabel}>Global Rank</Text>
            <Ionicons name="trophy" size={24} color="#059669" style={styles.statIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(protected)/quiz/mistakes')}
            activeOpacity={0.8}
          >
            <Text 
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {currentFocus || 'None'}
            </Text>
            <Text style={styles.statLabel}>Focus</Text>
            <Ionicons name="target" size={24} color="#059669" style={styles.statIcon} />
          </TouchableOpacity>
        </View>

        {/* Performance Chart Section */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Performance Trend</Text>
          <View style={styles.chartCard}>
            {isLoadingChart ? (
              <View style={styles.chartLoadingContainer}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : chartData.length === 0 ? (
              <View style={styles.chartEmptyContainer}>
                <Text style={styles.chartEmptyText}>Play a quiz to unlock your trend graph!</Text>
              </View>
            ) : (
              <LineChart
                data={chartData}
                areaChart={true}
                curved={true}
                color="#059669"
                startFillColor="#059669"
                endFillColor="#059669"
                startOpacity={0.3}
                endOpacity={0.1}
                hideDataPoints={false}
                dataPointsColor="#059669"
                thickness={3}
                rulesType="solid"
                rulesColor="#E0E0E0"
                yAxisTextStyle={{ color: '#888' }}
                width={chartWidth}
                maxValue={100}
                noOfSections={4}
                height={200}
              />
            )}
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.badgesGrid}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  !badge.unlocked && styles.badgeCardLocked,
                ]}
              >
                <Text style={[styles.badgeEmoji, !badge.unlocked && styles.badgeEmojiLocked]}>
                  {badge.emoji}
                </Text>
                <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
                  {badge.name}
                </Text>
                <Text style={[styles.badgeThreshold, !badge.unlocked && styles.badgeThresholdLocked]}>
                  {badge.threshold.toLocaleString()} coins
                </Text>
                {badge.unlocked && (
                  <View style={styles.badgeCheckmark}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 4,
    borderColor: '#059669',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#059669',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  editIconButton: {
    padding: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 100,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  statIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.3,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLoadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  badgesSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  badgeCardLocked: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  badgeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  badgeEmojiLocked: {
    opacity: 0.3,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: '#999',
  },
  badgeThreshold: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  badgeThresholdLocked: {
    color: '#999',
  },
  badgeCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

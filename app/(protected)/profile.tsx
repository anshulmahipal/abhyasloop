import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image } from 'react-native';
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
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
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
              ellipsizeMode="tail"
            >
              {currentFocus || 'None'}
            </Text>
            <Text style={styles.statLabel}>Focus</Text>
            <Ionicons name="target" size={24} color="#059669" style={styles.statIcon} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => router.push('/(protected)/stats')}
          activeOpacity={0.7}
        >
          <View style={styles.settingsIconWrap}>
            <Ionicons name="stats-chart" size={20} color="#059669" />
          </View>
          <Text style={styles.settingsLabel}>Stats</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Performance Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={22} color="#059669" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Performance Trend</Text>
          </View>
          <View style={styles.chartCard}>
            {isLoadingChart ? (
              <View style={styles.chartLoadingContainer}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : chartData.length === 0 ? (
              <View style={styles.chartEmptyContainer}>
                <Ionicons name="trending-up-outline" size={48} color="#cbd5e1" style={styles.chartEmptyIcon} />
                <Text style={styles.chartEmptyText}>Play an exam to unlock your trend graph</Text>
                <TouchableOpacity
                  style={styles.chartEmptyCta}
                  onPress={() => router.push('/(protected)/quiz/config')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chartEmptyCtaText}>Start a quiz</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
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
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={22} color="#059669" style={styles.sectionIcon} />
            <View>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Text style={styles.sectionSubtitle}>Earn coins to unlock badges</Text>
            </View>
          </View>
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
    backgroundColor: '#e0f2fe',
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
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#059669',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
    marginBottom: 16,
    gap: 10,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionIcon: {
    marginRight: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
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
    paddingHorizontal: 24,
  },
  chartEmptyIcon: {
    marginBottom: 12,
  },
  chartEmptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  chartEmptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  chartEmptyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  badgesSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
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

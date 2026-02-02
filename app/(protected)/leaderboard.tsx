import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LeaderboardUser {
  id: string;
  full_name: string | null;
  coins: number;
  avatar_url: string | null;
  rank: number;
}

interface LeagueInfo {
  name: string;
  icon: string;
  color: string;
  emoji: string;
}

const getLeague = (rank: number): LeagueInfo => {
  if (rank >= 1 && rank <= 3) {
    return {
      name: 'Diamond League',
      icon: 'diamond',
      color: '#B9F2FF',
      emoji: '💎',
    };
  } else if (rank >= 4 && rank <= 10) {
    return {
      name: 'Gold League',
      icon: 'medal',
      color: '#FFD700',
      emoji: '🥇',
    };
  } else if (rank >= 11 && rank <= 25) {
    return {
      name: 'Silver League',
      icon: 'medal',
      color: '#C0C0C0',
      emoji: '🥈',
    };
  } else {
    return {
      name: 'Bronze League',
      icon: 'medal',
      color: '#CD7F32',
      emoji: '🥉',
    };
  }
};

const getPromotionHint = (rank: number): string | null => {
  if (rank === 11) {
    return '1 rank away from Gold League! 🚀';
  } else if (rank === 12) {
    return '2 ranks away from Gold League! 🚀';
  } else if (rank === 26) {
    return '1 rank away from Silver League! 🚀';
  } else if (rank === 27) {
    return '2 ranks away from Silver League! 🚀';
  } else if (rank === 4) {
    return '1 rank away from Diamond League! 🚀';
  }
  return null;
};

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<LeaderboardUser | null>(null);
  
  const winnerScale = useRef(new Animated.Value(1)).current;
  const winnerGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (leaderboard.length > 0 && user) {
      const rank = leaderboard.findIndex((u) => u.id === user.id);
      if (rank !== -1) {
        setCurrentUserRank(rank + 1);
        setCurrentUserData(leaderboard[rank]);
      } else {
        fetchUserRank();
      }
    }
  }, [leaderboard, user]);

  // Winner glow animation
  useEffect(() => {
    if (currentUserRank === 1) {
      const scaleAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(winnerScale, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(winnerScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      
      const glowAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(winnerGlow, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(winnerGlow, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );

      scaleAnim.start();
      glowAnim.start();

      return () => {
        scaleAnim.stop();
        glowAnim.stop();
      };
    }
  }, [currentUserRank]);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, coins, avatar_url')
        .order('coins', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('Error fetching leaderboard:', fetchError);
        setError('Failed to load leaderboard');
        return;
      }

      if (!data || data.length === 0) {
        setLeaderboard([]);
        return;
      }

      const rankedData: LeaderboardUser[] = data.map((user, index) => ({
        ...user,
        rank: index + 1,
        full_name: user.full_name || 'Anonymous',
        coins: user.coins || 0,
      }));

      setLeaderboard(rankedData);
    } catch (err) {
      console.error('Unexpected error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRank = async () => {
    if (!user || !profile) return;

    try {
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('coins', profile.coins || 0);

      if (!countError && count !== null) {
        const rank = count + 1;
        setCurrentUserRank(rank);
        setCurrentUserData({
          id: user.id,
          full_name: profile.full_name || 'Anonymous',
          coins: profile.coins || 0,
          avatar_url: profile.avatar_url,
          rank,
        });
      }
    } catch (err) {
      console.error('Error fetching user rank:', err);
    }
  };

  const renderAvatar = (avatarUrl: string | null, name: string, size: number = 48, borderColor?: string) => {
    const avatarContent = avatarUrl ? (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    ) : (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );

    if (borderColor) {
      const glowOpacity = winnerGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 1],
      });

      return (
        <Animated.View
          style={[
            styles.avatarContainer,
            {
              width: size + 8,
              height: size + 8,
              borderRadius: (size + 8) / 2,
              borderColor,
              shadowColor: borderColor,
              shadowOpacity: glowOpacity,
            },
          ]}
        >
          {avatarContent}
        </Animated.View>
      );
    }

    return avatarContent;
  };

  const renderPodium = () => {
    if (leaderboard.length === 0) return null;

    const top3 = leaderboard.slice(0, 3);
    const [first, second, third] = [
      top3[0] || null,
      top3[1] || null,
      top3[2] || null,
    ];

    return (
      <View style={styles.podiumContainer}>
        {/* Second Place (Left) */}
        <View style={[styles.podiumItem, styles.podiumLeft]}>
          {second ? (
            <>
              <View style={styles.podiumBadgeContainer}>
                <Text style={styles.podiumRankNumber}>2</Text>
                <Ionicons name="medal" size={28} color="#C0C0C0" />
              </View>
              {renderAvatar(second.avatar_url, second.full_name, 75)}
              <Text style={styles.podiumName} numberOfLines={1}>
                {second.full_name}
              </Text>
              <View style={styles.podiumCoins}>
                <Text style={styles.podiumCoinsText}>🪙 {second.coins.toLocaleString()}</Text>
              </View>
              <View style={styles.podiumLeague}>
                <Text style={styles.podiumLeagueText}>{getLeague(2).emoji} Diamond</Text>
              </View>
            </>
          ) : (
            <View style={styles.podiumEmpty} />
          )}
        </View>

        {/* First Place (Center) */}
        <View style={styles.podiumItem}>
          {first ? (
            <>
              <Animated.View
                style={[
                  styles.podiumBadgeContainer,
                  styles.podiumBadgeGold,
                  { transform: [{ scale: winnerScale }] },
                ]}
              >
                <Text style={styles.podiumRankNumber}>1</Text>
                <Text style={styles.crownIcon}>👑</Text>
              </Animated.View>
              {renderAvatar(first.avatar_url, first.full_name, 100, '#FFD700')}
              <View style={styles.winnerLabel}>
                <Text style={styles.winnerText}>CHAMPION</Text>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>
                {first.full_name}
              </Text>
              <View style={styles.podiumCoins}>
                <Text style={styles.podiumCoinsText}>🪙 {first.coins.toLocaleString()}</Text>
              </View>
              <View style={styles.podiumLeague}>
                <Text style={styles.podiumLeagueText}>{getLeague(1).emoji} Diamond</Text>
              </View>
            </>
          ) : (
            <View style={styles.podiumEmpty} />
          )}
        </View>

        {/* Third Place (Right) */}
        <View style={[styles.podiumItem, styles.podiumRight]}>
          {third ? (
            <>
              <View style={styles.podiumBadgeContainer}>
                <Text style={styles.podiumRankNumber}>3</Text>
                <Ionicons name="medal" size={28} color="#CD7F32" />
              </View>
              {renderAvatar(third.avatar_url, third.full_name, 75)}
              <Text style={styles.podiumName} numberOfLines={1}>
                {third.full_name}
              </Text>
              <View style={styles.podiumCoins}>
                <Text style={styles.podiumCoinsText}>🪙 {third.coins.toLocaleString()}</Text>
              </View>
              <View style={styles.podiumLeague}>
                <Text style={styles.podiumLeagueText}>{getLeague(3).emoji} Diamond</Text>
              </View>
            </>
          ) : (
            <View style={styles.podiumEmpty} />
          )}
        </View>
      </View>
    );
  };

  const renderListItem = ({ item }: { item: LeaderboardUser }) => {
    const isCurrentUser = item.id === user?.id;
    const league = getLeague(item.rank);
    
    return (
      <View style={[styles.listItem, isCurrentUser && styles.listItemCurrent]}>
        <Text style={styles.rankNumber}>{item.rank}</Text>
        {renderAvatar(item.avatar_url, item.full_name, 48)}
        <View style={styles.listItemContent}>
          <View style={styles.listItemNameRow}>
            <Text style={[styles.listItemName, isCurrentUser && styles.listItemNameCurrent]}>
              {item.full_name}
              {isCurrentUser && ' (You)'}
            </Text>
            <View style={[styles.leagueBadge, { backgroundColor: league.color + '20' }]}>
              <Text style={styles.leagueBadgeEmoji}>{league.emoji}</Text>
              <Text style={[styles.leagueBadgeText, { color: league.color }]}>
                {league.name.split(' ')[0]}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.listItemCoins}>
          <Text style={styles.listItemCoinsText}>🪙 {item.coins.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.emptyText}>Loading leaderboard...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B35" />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      );
    }

    if (leaderboard.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🏰</Text>
          <Text style={styles.emptyTitle}>You are the King of an empty castle!</Text>
          <Text style={styles.emptySubtitle}>
            Invite friends to compete and build your kingdom! 👑
          </Text>
        </View>
      );
    }

    return null;
  };

  const listData = leaderboard.slice(3);
  const promotionHint = currentUserRank ? getPromotionHint(currentUserRank) : null;

  return (
    <LinearGradient
      colors={['#2D1B69', '#000000']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wall of Fame</Text>
        <Text style={styles.headerSubtitle}>Compete for league supremacy</Text>
      </View>

      {renderPodium()}

      {leaderboard.length > 3 && (
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>Rankings</Text>
        </View>
      )}

      <FlatList
        data={listData}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky Footer - Current User Rank */}
      {currentUserRank && currentUserData && (
        <View style={styles.footer}>
          <View style={styles.footerGlass}>
            <View style={styles.footerContent}>
              <View style={styles.footerRank}>
                <Text style={styles.footerRankText}>#{currentUserRank}</Text>
              </View>
              {renderAvatar(currentUserData.avatar_url, currentUserData.full_name, 45)}
              <View style={styles.footerInfo}>
                <View style={styles.footerNameRow}>
                  <Text style={styles.footerName}>{currentUserData.full_name}</Text>
                  <View style={[styles.leagueBadgeSmall, { backgroundColor: getLeague(currentUserRank).color + '30' }]}>
                    <Text style={styles.leagueBadgeEmojiSmall}>{getLeague(currentUserRank).emoji}</Text>
                  </View>
                </View>
                <View style={styles.footerBottomRow}>
                  <Text style={styles.footerCoins}>🪙 {currentUserData.coins.toLocaleString()}</Text>
                  {promotionHint && (
                    <Text style={styles.promotionHint}>{promotionHint}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: 40,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumLeft: {
    paddingTop: 20,
  },
  podiumRight: {
    paddingTop: 20,
  },
  podiumBadgeContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  podiumBadgeGold: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  podiumRankNumber: {
    position: 'absolute',
    top: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  crownIcon: {
    fontSize: 24,
  },
  avatarContainer: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: '700',
    color: '#ffffff',
  },
  winnerLabel: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFD700',
    borderRadius: 16,
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    maxWidth: 100,
    textAlign: 'center',
  },
  podiumCoins: {
    marginTop: 6,
  },
  podiumCoinsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },
  podiumLeague: {
    marginTop: 6,
  },
  podiumLeagueText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  podiumEmpty: {
    height: 200,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemCurrent: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  rankNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  listItemNameCurrent: {
    color: '#FFD700',
    fontWeight: '700',
  },
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  leagueBadgeEmoji: {
    fontSize: 14,
  },
  leagueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leagueBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  leagueBadgeEmojiSmall: {
    fontSize: 12,
  },
  listItemCoins: {
    alignItems: 'flex-end',
  },
  listItemCoinsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 90,
  },
  footerGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRank: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  footerRankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerInfo: {
    flex: 1,
  },
  footerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  footerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  footerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerCoins: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  promotionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
    flex: 1,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
  },
});

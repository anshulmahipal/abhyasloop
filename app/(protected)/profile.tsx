import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Badge {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
  unlocked: boolean;
}

export default function ProfilePage() {
  const { profile, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [isLoadingRank, setIsLoadingRank] = useState(true);
  const [memberSince, setMemberSince] = useState<string>('');

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

  const handleLogout = async () => {
    // Web-specific confirmation
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (!confirmed) {
        return;
      }
      
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
        window.alert('Failed to log out. Please try again.');
      }
      return;
    }
    
    // Native platforms use Alert
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

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
          <ActivityIndicator size="large" color="#FF512F" />
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
                <Ionicons name="person" size={60} color="#FF512F" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          {memberSince && (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          )}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/(protected)/profile/edit')}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={18} color="#FF512F" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{coins.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Coins</Text>
            <Ionicons name="wallet" size={24} color="#FF512F" style={styles.statIcon} />
          </View>
          <View style={styles.statCard}>
            {isLoadingRank ? (
              <ActivityIndicator size="small" color="#FF512F" />
            ) : (
              <Text style={styles.statValue}>#{globalRank || '—'}</Text>
            )}
            <Text style={styles.statLabel}>Global Rank</Text>
            <Ionicons name="trophy" size={24} color="#FF512F" style={styles.statIcon} />
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1}>{currentFocus}</Text>
            <Text style={styles.statLabel}>Focus</Text>
            <Ionicons name="target" size={24} color="#FF512F" style={styles.statIcon} />
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
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
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
    borderColor: '#FF512F',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF512F',
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF512F',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF512F',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
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
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF512F',
    marginBottom: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  statIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.3,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#F44336',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});

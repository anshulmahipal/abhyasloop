import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardPage() {
  const { profile, loading, user } = useAuth();

  console.log('Dashboard render:', { loading, hasUser: !!user, hasProfile: !!profile });

  // Show loading only for a short time, then show content even if profile is loading
  if (loading && !user) {
    console.log('Dashboard: Showing loading screen');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  console.log('Dashboard: Rendering content, displayName:', displayName);

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome, {displayName}!</Text>
      {profile && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.coins || 0}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.current_streak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      )}
      <Text style={styles.title}>Dashboard</Text>
      <Link href="/(protected)/quiz/config" style={styles.link}>
        <Text style={styles.linkText}>Start Quiz</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
    marginBottom: 30,
  },
  link: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  linkText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

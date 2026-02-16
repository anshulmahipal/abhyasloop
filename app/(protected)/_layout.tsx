import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { syncPendingMistakes } from '../../lib/mistakeSync';
import { Sidebar } from '../../components/Sidebar';
import { MobileNav } from '../../components/MobileNav';

const MD_BREAKPOINT = 768;
const MOBILE_NAV_PADDING = 88;

export default function ProtectedLayout() {
  const { session, loading } = useAuth();

  // Sync pending mistakes on app start when user is authenticated
  useEffect(() => {
    if (session && !loading) {
      // Sync in background, don't block UI
      syncPendingMistakes().catch((err) => {
        // Errors are already handled inside syncPendingMistakes
        console.error('Unexpected error syncing mistakes on app start:', err);
      });
    }
  }, [session, loading]);

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // This should rarely happen since root layout redirects, but keep as safety check
  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please log in to access this section</Text>
      </View>
    );
  }

  const { width } = useWindowDimensions();
  const isDesktop = width >= MD_BREAKPOINT;

  return (
    <SafeAreaView
      style={[styles.shell, { flexDirection: isDesktop ? 'row' : 'column' }]}
      edges={['top']}
    >
      {isDesktop && <Sidebar />}
      <View
        style={[
          styles.main,
          !isDesktop && { paddingBottom: MOBILE_NAV_PADDING },
        ]}
      >
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
          <Tabs.Screen name="leaderboard" options={{ title: 'Rankings' }} />
          <Tabs.Screen name="quiz_start" options={{ title: '' }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
          <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
      <Tabs.Screen
        name="quiz"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="result"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="new-quiz"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="quiz/review-simple"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="quiz/review/[attemptId]"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="quiz/mistakes"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/wallet"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="settings/reports"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="history/index"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="history/[id]"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="feedback/index"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="feedback/create"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="feedback/[id]"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
        </Tabs>
      </View>
      {!isDesktop && <MobileNav />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
  shell: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  main: {
    flex: 1,
  },
});

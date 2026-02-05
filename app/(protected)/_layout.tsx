import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { syncPendingMistakes } from '../../lib/mistakeSync';

function QuizTabButton(props: any) {
  const router = useRouter();
  return (
    <TouchableOpacity
      {...props}
      style={styles.quizTabButton}
      onPress={() => router.push('/(protected)/quiz/config')}
      activeOpacity={0.7}
    >
      <View style={styles.quizTabButtonContent}>
        <Ionicons name="rocket" size={30} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FF512F',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz_start"
        options={{
          title: '',
          tabBarButton: (props) => <QuizTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={26} color={color} />
          ),
        }}
      />
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
    </Tabs>
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
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    paddingBottom: 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    borderTopWidth: 0,
    ...(Platform.OS === 'web' && {
      maxWidth: 500,
      alignSelf: 'center',
    }),
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  tabBarIcon: {
    marginTop: 4,
  },
  quizTabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF512F',
    alignItems: 'center',
    justifyContent: 'center',
    top: -20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  quizTabButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Import polyfills first to ensure window is defined before any Supabase imports
import '../lib/polyfills';

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SessionProvider, useSession } from '../contexts/SessionContext';
import { AuthProvider } from '../contexts/AuthContext';
import { PostHogProvider } from '../components/PostHogProvider';

function RootLayoutNav() {
  const { session, loading } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const currentRoute = segments[0] || '';
    const isIndex = !currentRoute || currentRoute === 'index';
    const isAuth = currentRoute === 'auth';
    const isProtected = currentRoute === '(protected)';

    // Redirect logic: never show landing inside the app — go straight to auth or dashboard
    if (session) {
      if (isAuth || isIndex) {
        router.replace('/(protected)/dashboard');
      }
    } else {
      // Not signed in: from index or protected → auth (login)
      if (isIndex || isProtected) {
        router.replace('/auth');
      }
    }
  }, [session, loading, segments, router]);

  // Show loading splash screen while checking initial session
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#059669',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Tyariwale', headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <PostHogProvider>
      <SessionProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SessionProvider>
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

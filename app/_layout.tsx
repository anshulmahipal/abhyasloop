// Import polyfills first to ensure window is defined before any Supabase imports
import '../lib/polyfills';

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SessionProvider, useSession } from '../contexts/SessionContext';
import { AuthProvider } from '../contexts/AuthContext';

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

    // Redirect logic based on session
    if (session) {
      // User is signed in
      if (isAuth || isIndex) {
        // Redirect from auth/index to dashboard
        router.replace('/(protected)/dashboard');
      }
    } else {
      // User is not signed in
      if (isProtected) {
        // Redirect from protected routes to auth
        router.replace('/auth');
      }
    }
  }, [session, loading, segments, router]);

  // Show loading splash screen while checking initial session
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f4511e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'AbhyasLoop', headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(protected)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SessionProvider>
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

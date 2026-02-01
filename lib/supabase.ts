// Import polyfills first to prevent "window is not defined" errors
import './polyfills';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Custom storage adapter that works with React Native Web
const createStorageAdapter = () => {
  // For web, use a custom adapter that directly uses localStorage
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string): Promise<string | null> => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            return Promise.resolve(window.localStorage.getItem(key));
          }
        } catch (e) {
          console.warn('localStorage getItem error:', e);
        }
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string): Promise<void> => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
        } catch (e) {
          console.warn('localStorage setItem error:', e);
        }
        return Promise.resolve();
      },
      removeItem: (key: string): Promise<void> => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn('localStorage removeItem error:', e);
        }
        return Promise.resolve();
      },
    };
  }
  
  // For native platforms, use AsyncStorage
  return AsyncStorage;
};

// Expo loads EXPO_PUBLIC_* variables at build time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug: Log what we're getting (only in dev)
if (__DEV__) {
  console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
  console.log('Supabase Key:', supabaseAnonKey ? 'Found' : 'Missing');
}

if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  throw new Error(
    `Missing or invalid EXPO_PUBLIC_SUPABASE_URL environment variable. Got: ${supabaseUrl}`
  );
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '') {
  throw new Error(
    `Missing or invalid EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. Got: ${supabaseAnonKey ? 'Present but empty' : 'Missing'}`
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (e) {
  throw new Error(
    `Invalid EXPO_PUBLIC_SUPABASE_URL format. Must be a valid HTTP/HTTPS URL. Got: ${supabaseUrl}`
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'abhyasloop@1.0.0',
    },
  },
});

export { supabase };

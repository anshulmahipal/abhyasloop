import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { posthog } from '../../lib/posthog';

export default function SetupProfileScreen() {
  const router = useRouter();
  const { session, user, refreshProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (session?.user?.user_metadata?.full_name) {
      setFullName(session.user.user_metadata.full_name);
    }
  }, [session]);

  useEffect(() => {
    if (!session && !user) {
      router.replace('/auth');
    }
  }, [session, user, router]);

  const handleSubmit = async () => {
    const name = fullName.trim();
    if (!name) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!user?.id) {
      setErrorMessage('Session missing. Please sign in again.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          email: user.email ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email ?? null,
            full_name: name,
          });
          if (insertError) {
            setErrorMessage(insertError.message);
            setIsLoading(false);
            return;
          }
        } else {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }
      }

      await refreshProfile();
      posthog.capture('profile_setup_completed');
      posthog.identify(user.id, { $set: { full_name: name, email: user.email } });
      router.replace('/(protected)/dashboard');
    } catch (err) {
      console.error('Setup profile error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session && !user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const email = user?.email ?? '';

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.container, isMobile && styles.containerMobile]}>
        <View style={styles.card}>
          <View style={styles.brandBlock}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="TyariWale logo"
            />
            <Text style={styles.title}>TyariWale</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.heading}>Almost there</Text>
            <Text style={styles.subtitle}>Add your name so we know how to address you.</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={(t) => {
                  setFullName(t);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 60,
  },
  scrollContentMobile: {
    paddingVertical: 20,
    paddingBottom: 60,
  },
  container: {
    width: '100%',
    maxWidth: 450,
    paddingHorizontal: 20,
  },
  containerMobile: {
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputDisabled: {
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    borderColor: '#d1d5db',
  },
  errorBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

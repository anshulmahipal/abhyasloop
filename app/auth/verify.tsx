import { useState, useRef, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { posthog } from '../../lib/posthog';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const email = (params.email ?? '').trim();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!email) {
      router.replace('/auth/login');
    }
  }, [email, router]);

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  const handleVerifyOtp = async () => {
    const code = otp.replace(/\s/g, '').replace(/\D/g, '');
    if (!email) {
      setErrorMessage('Email is missing. Please start again from the login screen.');
      return;
    }
    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the 6-digit code from your email.');
      return;
    }

    setErrorMessage('');
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) {
        const msg = error.message + (error.message.toLowerCase().includes('expired') ? ' Use "Resend code" for a new one.' : '');
        setErrorMessage(msg);
        setIsVerifying(false);
        return;
      }

      if (!data.session?.user) {
        setErrorMessage('Verification succeeded but no session. Please try again.');
        setIsVerifying(false);
        return;
      }

      posthog.identify(data.session.user.id, { $set: { email: data.session.user.email } });
      posthog.capture('email_verified', { method: 'otp' });

      const userId = data.session.user.id;
      const fullNameFromMetadata = data.session.user.user_metadata?.full_name;

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .maybeSingle();

      const hasProfile = !profileError && profileRow != null;
      const hasName = !!(fullNameFromMetadata?.trim() || (profileRow?.full_name ?? '').trim());

      if (hasProfile && hasName) {
        router.replace('/(protected)/dashboard');
      } else {
        router.replace('/auth/setup-profile');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    setErrorMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setOtp('');
    setResendCooldown(60);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (resendIntervalRef.current) {
            clearInterval(resendIntervalRef.current);
            resendIntervalRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  if (!email) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

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
            <Text style={styles.otpTitle}>Check your email</Text>
            <Text style={styles.otpSubtitle}>
              We sent a 6-digit code to {email}. Enter it below.
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#999"
              value={otp}
              onChangeText={(t) => {
                setOtp(t.replace(/\D/g, '').slice(0, 6));
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifying}
              autoFocus
            />

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, isVerifying && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={isVerifying || resendCooldown > 0}
              activeOpacity={0.7}
            >
              <Text style={resendCooldown > 0 ? styles.resendCooldownText : styles.resendButtonText}>
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/auth/login')}
              disabled={isVerifying}
            >
              <Text style={styles.secondaryButtonText}>Use a different email</Text>
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
  otpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  otpInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 8,
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
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
    marginBottom: 8,
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
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  resendCooldownText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
  },
});

import { useState, useEffect, useRef } from 'react';
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
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getAuthRedirectBaseUrl } from '../../lib/auth-utils';
import { posthog } from '../../lib/posthog';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type AuthMode = 'signin' | 'signup';

export default function PasswordAuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAuth = async () => {
    setErrorMessage('');
    if (!email?.trim()) {
      setErrorMessage('Please enter your email');
      return;
    }
    if (!password || !password.trim()) {
      setErrorMessage('Please enter your password');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }
        if (data.user) {
          posthog.identify(data.user.id, { $set: { email: data.user.email } });
          posthog.capture('user_signed_in', { method: 'email_password' });
          router.replace('/(protected)/dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: getAuthRedirectBaseUrl(),
          },
        });
        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }
        if (data.user) {
          posthog.identify(data.user.id, {
            $set: { email: data.user.email, full_name: fullName.trim() },
            $set_once: { signed_up_at: new Date().toISOString() },
          });
          posthog.capture('user_signed_up', { method: 'email_password' });
          setPendingVerificationEmail(email.trim());
          setOtpCode('');
          setErrorMessage('');
          setMode('signin');
          setPassword('');
          setFullName('');
        } else {
          setErrorMessage('Account creation failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.trim().replace(/\s/g, '').replace(/\D/g, '');
    if (!code || !pendingVerificationEmail) {
      setErrorMessage('Please enter the 6-digit code from your email.');
      return;
    }
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits.');
      return;
    }
    setErrorMessage('');
    setIsVerifyingOtp(true);
    let result = await supabase.auth.verifyOtp({
      email: pendingVerificationEmail,
      token: code,
      type: 'email',
    });
    if (result.error && /expired|invalid/.test(result.error.message.toLowerCase())) {
      result = await supabase.auth.verifyOtp({
        email: pendingVerificationEmail,
        token: code,
        type: 'signup',
      });
    }
    setIsVerifyingOtp(false);
    if (result.error) {
      setErrorMessage(
        result.error.message +
          (result.error.message.toLowerCase().includes('expired') ? ' Use "Resend code" for a new one.' : '')
      );
      return;
    }
    if (result.data.session) {
      posthog.capture('email_verified', { method: 'otp_code' });
      setPendingVerificationEmail(null);
      setOtpCode('');
      router.replace('/(protected)/dashboard');
    }
  };

  const handleResendOtp = async () => {
    if (!pendingVerificationEmail || resendCooldown > 0) return;
    setErrorMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingVerificationEmail,
      options: { emailRedirectTo: getAuthRedirectBaseUrl() },
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setOtpCode('');
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

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setPassword('');
    setErrorMessage('');
    if (pendingVerificationEmail) {
      setPendingVerificationEmail(null);
      setOtpCode('');
    }
  };

  if (pendingVerificationEmail) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, isMobile && styles.containerMobile]}>
          <View style={styles.card}>
            <View style={styles.brandBlock}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>TyariWale</Text>
            </View>
            <Text style={styles.otpTitle}>Verify your email</Text>
            <Text style={styles.otpSubtitle}>
              We sent a code to {pendingVerificationEmail}. Enter the 6-digit code below.
            </Text>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#999"
              value={otpCode}
              onChangeText={(t) => {
                setOtpCode(t.replace(/\D/g, '').slice(0, 6));
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifyingOtp}
            />
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryButton, isVerifyingOtp && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isVerifyingOtp}
            >
              {isVerifyingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOtp}
              disabled={isVerifyingOtp || resendCooldown > 0}
            >
              <Text style={resendCooldown > 0 ? styles.resendCooldownText : styles.resendButtonText}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setPendingVerificationEmail(null)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>TyariWale</Text>
          </View>

          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errorMessage) setErrorMessage(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(t) => { setPassword(t); if (errorMessage) setErrorMessage(''); }}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={toggleMode} disabled={isLoading}>
              <Text style={styles.secondaryButtonText}>{mode === 'signin' ? 'Create account' : 'Back to Sign In'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Back to email code</Text>
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
  scrollContentMobile: { paddingVertical: 20, paddingBottom: 60 },
  container: { width: '100%', maxWidth: 450, paddingHorizontal: 20 },
  containerMobile: { paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  brandBlock: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 72, height: 72, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#059669', textAlign: 'center' },
  form: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
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
  errorBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
  },
  errorText: { color: '#DC2626', fontSize: 14, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#059669', fontSize: 14, fontWeight: '500' },
  otpTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  otpSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
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
  resendButton: { paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  resendButtonText: { fontSize: 14, color: '#059669', fontWeight: '500' },
  resendCooldownText: { fontSize: 14, color: '#9CA3AF' },
});

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { getAuthRedirectBaseUrl } from '../../lib/auth-utils';
import { posthog } from '../../lib/posthog';

type AuthMode = 'signin' | 'signup';

/** On web, check if URL has auth callback params (e.g. after email verify or magic link). */
function hasAuthCallbackInUrl(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const h = window.location.hash || '';
  const q = window.location.search || '';
  return (
    /access_token|refresh_token|code=/.test(h) ||
    /token_hash|code=/.test(q)
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCallbackHandling, setIsCallbackHandling] = useState(() => hasAuthCallbackInUrl());
  /** After signup, user can verify via link or enter the 6-digit OTP from email. */
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAuth = async () => {
    setErrorMessage('');
    console.log('handleAuth called, mode:', mode);
    console.log('Form values:', {
      email,
      emailLength: email.length,
      password,
      passwordLength: password.length,
      passwordType: typeof password,
      fullName,
      mode,
    });

    // Validate inputs
    if (!email || !email.trim()) {
      console.log('Validation failed: email empty');
      setErrorMessage('Please enter your email');
      return;
    }

    if (!password || password.length === 0 || !password.trim()) {
      console.log('Validation failed: password empty', {
        password,
        passwordLength: password?.length,
        passwordTrimmed: password?.trim(),
      });
      setErrorMessage('Please enter your password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log('Validation failed: invalid email format');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      console.log('Validation failed: password too short');
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    // Full name validation for sign up
    if (mode === 'signup' && !fullName.trim()) {
      console.log('Validation failed: full name empty');
      setErrorMessage('Please enter your full name');
      return;
    }

    console.log('Validation passed, starting auth...');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Track successful sign in
          posthog.identify(data.user.id, {
            $set: { email: data.user.email },
          });
          posthog.capture('user_signed_in', {
            method: 'email_password',
          });
          // Success - navigate to dashboard
          router.replace('/(protected)/dashboard');
        }
      } else {
        // Sign up with full_name in metadata
        // emailRedirectTo: where the verification link sends the user (must be in Supabase Auth → Redirect URLs)
        console.log('Attempting sign up...');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: getAuthRedirectBaseUrl(),
          },
        });

        console.log('Sign up response:', { data, error });

        if (error) {
          console.error('Sign up error:', error);
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          console.log('Sign up successful, user ID:', data.user.id);
          // Track successful sign up
          posthog.identify(data.user.id, {
            $set: { email: data.user.email, full_name: fullName.trim() },
            $set_once: { signed_up_at: new Date().toISOString() },
          });
          posthog.capture('user_signed_up', {
            method: 'email_password',
          });
          setPendingVerificationEmail(email.trim());
          setOtpCode('');
          setErrorMessage('');
          setMode('signin');
          setPassword('');
          setFullName('');
        } else {
          console.error('Sign up succeeded but no user data');
          setErrorMessage('Account creation failed. Please try again.');
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  // On web, when we landed with auth callback params, show loading until session is set or timeout
  useEffect(() => {
    if (!isCallbackHandling || Platform.OS !== 'web') return;
    const t = setTimeout(() => setIsCallbackHandling(false), 5000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setIsCallbackHandling(false);
    });
    return () => {
      clearTimeout(t);
      subscription.unsubscribe();
    };
  }, [isCallbackHandling]);

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
    // Try 'email' first (Supabase docs); fallback to 'signup' for some projects
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
    const { data, error } = result;
    if (error) {
      setErrorMessage(
        error.message +
          (error.message.toLowerCase().includes('expired')
            ? ' Use "Resend code" for a new one.'
            : '')
      );
      return;
    }
    if (data.session) {
      // Track successful email verification
      posthog.capture('email_verified', {
        method: 'otp_code',
      });
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

  const dismissPendingVerification = () => {
    setPendingVerificationEmail(null);
    setOtpCode('');
    setErrorMessage('');
  };

  const toggleMode = () => {
    const newMode = mode === 'signin' ? 'signup' : 'signin';
    setMode(newMode);
    setPassword('');
    setErrorMessage('');
    if (pendingVerificationEmail) dismissPendingVerification();
  };

  const handleTermsPress = () => {
    Linking.openURL('https://google.com').catch((err) => {
      console.error('Failed to open Terms URL:', err);
      Alert.alert('Error', 'Unable to open browser.');
    });
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://google.com').catch((err) => {
      console.error('Failed to open Privacy Policy URL:', err);
      Alert.alert('Error', 'Unable to open browser.');
    });
  };

  if (isCallbackHandling) {
    return (
      <View style={[styles.container, styles.callbackLoadingContainer]}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.callbackLoadingText}>Completing sign-in…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        isMobile && styles.scrollContentMobile,
      ]}
    >
      <View style={[styles.container, isMobile && styles.containerMobile]}>
        <View style={styles.card}>
          {/* Logo + Title + Slogan */}
          <View style={styles.brandBlock}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="TyariWale logo"
            />
            <Text style={styles.title}>TyariWale</Text>
            <View style={styles.sloganRow}>
              <Ionicons name="school-outline" size={18} color="#059669" style={styles.sloganIcon} />
              <Text style={styles.slogan}>For the aspirants, by the aspirants</Text>
            </View>
          </View>

          {/* Pending email verification: enter OTP from email */}
          {pendingVerificationEmail ? (
            <View style={styles.otpBlock}>
              <Text style={styles.otpTitle}>Verify your email</Text>
              <Text style={styles.otpSubtitle}>
                We sent a code to {pendingVerificationEmail}. Enter the 6-digit code below, or use the link in the email.
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
                autoFocus
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
                activeOpacity={0.8}
              >
                {isVerifyingOtp ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify with code</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={isVerifyingOtp || resendCooldown > 0}
                activeOpacity={0.7}
              >
                <Text style={resendCooldown > 0 ? styles.resendCooldownText : styles.resendButtonText}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={dismissPendingVerification}
                disabled={isVerifyingOtp}
              >
                <Text style={styles.secondaryButtonText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.form}>
            {/* Full Name - only show in signup mode */}
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
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
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                onBlur={() => {
                  console.log('Password field blurred, current value length:', password.length);
                }}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                textContentType="password"
                autoComplete="password"
              />
              {__DEV__ && password.length > 0 && (
                <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {password.length} characters
                </Text>
              )}
            </View>

            {errorMessage ? (
              <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 8 }}>
                <Text style={{ color: '#DC2626', fontSize: 14, textAlign: 'center' }}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={() => {
                console.log('Sign Up button pressed, mode:', mode);
                handleAuth();
              }}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password - sign in only */}
            {mode === 'signin' && (
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => router.push('/auth/forgot-password')}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Having trouble? / Help */}
            <Link href="/auth/help" asChild>
              <TouchableOpacity style={styles.helpLink} disabled={isLoading}>
                <Text style={styles.helpLinkText}>Having trouble?</Text>
              </TouchableOpacity>
            </Link>

            {/* Secondary Toggle Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={toggleMode}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                {mode === 'signin'
                  ? 'Switch to Sign Up'
                  : 'Switch to Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
          )}

          {/* Legal Compliance Footer */}
          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink} onPress={handleTermsPress}>
                Terms
              </Text>
              {' '}and{' '}
              <Text style={styles.legalLink} onPress={handlePrivacyPress}>
                Privacy Policy
              </Text>
              .
            </Text>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 8,
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sloganIcon: {
    marginRight: 6,
  },
  slogan: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  form: {
    width: '100%',
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
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  forgotPasswordLink: {
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  helpLink: {
    alignItems: 'center',
    marginBottom: 16,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    textDecorationLine: 'underline',
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
  legalFooter: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  legalText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#059669',
    textDecorationLine: 'underline',
  },
  callbackLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  callbackLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  otpBlock: {
    width: '100%',
    marginBottom: 8,
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
});

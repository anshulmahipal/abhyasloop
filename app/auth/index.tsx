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
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { posthog } from '../../lib/posthog';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'EMAIL_INPUT' | 'OTP_INPUT';

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

  const [step, setStep] = useState<Step>('EMAIL_INPUT');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCallbackHandling, setIsCallbackHandling] = useState(() => hasAuthCallbackInUrl());

  useEffect(() => {
    if (!isCallbackHandling || Platform.OS !== 'web') return;
    const t = setTimeout(() => setIsCallbackHandling(false), 5000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsCallbackHandling(false);
        if (event === 'PASSWORD_RECOVERY') {
          router.replace('/auth/set-password');
        }
      }
    });
    return () => {
      clearTimeout(t);
      subscription.unsubscribe();
    };
  }, [isCallbackHandling, router]);

  const handleSendVerificationCode = async () => {
    const trimmed = email.trim();
    setErrorMessage('');

    if (!trimmed) {
      setErrorMessage('Please enter your email');
      return;
    }
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      posthog.capture('otp_sent', { method: 'email' });
      setOtp('');
      setStep('OTP_INPUT');
    } catch (err) {
      console.error('Send OTP error:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(
        /failed to fetch|network request failed/i.test(msg)
          ? 'Network error. Check your connection and try again.'
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndLogin = async () => {
    const code = otp.replace(/\s/g, '').replace(/\D/g, '');
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Email is missing. Please start again.');
      return;
    }
    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the 6-digit code from your email.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: code,
        type: 'email',
      });

      if (error) {
        const msg = error.message.replace(/\btoken\b/gi, 'OTP');
        setErrorMessage(
          msg + (error.message.toLowerCase().includes('expired') ? ' Request a new code.' : '')
        );
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMessage('Verification succeeded but no session. Please try again.');
        setIsLoading(false);
        return;
      }

      posthog.identify(data.session.user.id, { $set: { email: data.session.user.email } });
      posthog.capture('email_verified', { method: 'otp' });

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const hasName = !!currentSession?.user?.user_metadata?.full_name;

      if (hasName) {
        router.replace('/(protected)/dashboard');
      } else {
        router.replace('/auth/setup');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(
        /failed to fetch|network request failed/i.test(msg)
          ? 'Network error. Check your connection and try again.'
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('EMAIL_INPUT');
    setOtp('');
    setErrorMessage('');
  };

  const handleTermsPress = () => {
    Linking.openURL('https://google.com').catch((err) => {
      console.error('Failed to open Terms URL:', err);
      Alert.alert('Error', 'Unable to open browser.');
    });
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://google.com').catch((err) => {
      console.error('Failed to open Privacy URL:', err);
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
            {step === 'EMAIL_INPUT' && (
              <Text style={styles.headingSubtitle}>Enter your email to receive a 6-digit login code.</Text>
            )}
          </View>

          <View style={styles.form}>
            {step === 'EMAIL_INPUT' ? (
              <>
                <View style={styles.inputContainer}>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      autoFocus
                    />
                  </View>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                    isLoading && styles.buttonLoadingOpacity,
                  ]}
                  onPress={handleSendVerificationCode}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" style={styles.buttonSpinner} />
                      <Text style={styles.primaryButtonText}>Sending...</Text>
                    </>
                  ) : (
                    <Text style={styles.primaryButtonText}>Send code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>Code sent to {email}</Text>
                <View style={styles.inputContainer}>
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
                    editable={!isLoading}
                    autoFocus
                  />
                </View>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyAndLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleBackToEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryButtonText}>Use a different email</Text>
                </TouchableOpacity>
              </>
            )}

          </View>

          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink} onPress={handleTermsPress}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.legalLink} onPress={handlePrivacyPress}>Privacy Policy</Text>.
            </Text>
            <Link href="/auth/help" asChild>
              <TouchableOpacity style={styles.helpLink} disabled={isLoading}>
                <Text style={styles.helpLinkText}>Having trouble?</Text>
              </TouchableOpacity>
            </Link>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
  },
  headingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  form: {
    width: '100%',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
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
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
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
  buttonLoadingOpacity: {
    opacity: 0.9,
  },
  buttonSpinner: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    color: '#059669',
    textDecorationLine: 'underline',
  },
  helpLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  helpLinkText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

import { useState } from 'react';
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
import { posthog } from '../../lib/posthog';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'EMAIL_INPUT' | 'OTP_INPUT';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [step, setStep] = useState<Step>('EMAIL_INPUT');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
        setErrorMessage(
          error.message +
            (error.message.toLowerCase().includes('expired') ? ' Request a new code.' : '')
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
            <View style={styles.sloganRow}>
              <Ionicons name="school-outline" size={18} color="#059669" style={styles.sloganIcon} />
              <Text style={styles.slogan}>For the aspirants, by the aspirants</Text>
            </View>
          </View>

          <View style={styles.form}>
            {step === 'EMAIL_INPUT' ? (
              <>
                <Text style={styles.subtitle}>Sign in with a one-time code sent to your email</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
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

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSendVerificationCode}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Verification code</Text>
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

            <Link href="/auth" asChild>
              <TouchableOpacity style={styles.secondaryButton} disabled={isLoading} activeOpacity={0.7}>
                <Text style={styles.secondaryButtonText}>Back to sign in options</Text>
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
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
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
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
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
});

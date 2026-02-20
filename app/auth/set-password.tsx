import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  /** When no session from URL, user can verify with OTP from reset email. */
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setSessionChecked(true);
    };
    const t = setTimeout(checkSession, 800);
    return () => clearTimeout(t);
  }, []);

  const handleVerifyRecoveryOtp = async () => {
    const email = recoveryEmail.trim();
    const code = recoveryOtp.trim().replace(/\s/g, '').replace(/\D/g, '');
    if (!email || !code) {
      setMessage({ type: 'error', text: 'Please enter your email and the 6-digit code.' });
      return;
    }
    if (code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter all 6 digits.' });
      return;
    }
    setMessage(null);
    setIsVerifyingOtp(true);
    let result = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (result.error && /expired|invalid/.test(result.error.message.toLowerCase())) {
      result = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });
    }
    setIsVerifyingOtp(false);
    const { data, error } = result;
    if (error) {
      setMessage({
        type: 'error',
        text: error.message + (error.message.toLowerCase().includes('expired') ? ' Request a new reset link from Forgot password.' : ''),
      });
      return;
    }
    if (data.session) {
      setHasSession(true);
      setMessage(null);
    }
  };

  const handleSubmit = async () => {
    const p = password.trim();
    const cp = confirmPassword.trim();
    if (!p) {
      setMessage({ type: 'error', text: 'Please enter a new password.' });
      return;
    }
    if (p.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (p !== cp) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setMessage(null);
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: p });
    setIsLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Password updated. Redirecting…' });
    router.replace('/(protected)/dashboard');
  };

  if (!sessionChecked) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Setting up…</Text>
      </View>
    );
  }

  // No session yet — user must enter email + OTP from reset email (or will get session from link on web)
  if (!hasSession) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your email and the 6-digit code from the reset email. You can use the code instead of clicking the link.
          </Text>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#999"
            value={recoveryEmail}
            onChangeText={(t) => {
              setRecoveryEmail(t);
              if (message) setMessage(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isVerifyingOtp}
          />
          <Text style={styles.label}>6-digit code</Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="000000"
            placeholderTextColor="#999"
            value={recoveryOtp}
            onChangeText={(t) => {
              setRecoveryOtp(t.replace(/\D/g, '').slice(0, 6));
              if (message) setMessage(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isVerifyingOtp}
          />
          {message ? (
            <View style={[styles.messageBox, styles.messageError]}>
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.button, isVerifyingOtp && styles.buttonDisabled]}
            onPress={handleVerifyRecoveryOtp}
            disabled={isVerifyingOtp}
            activeOpacity={0.8}
          >
            {isVerifyingOtp ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.subtitle}>Enter and confirm your new password below.</Text>
        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          placeholder="Min 6 characters"
          placeholderTextColor="#999"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (message) setMessage(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            if (message) setMessage(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        {message ? (
          <View
            style={[
              styles.messageBox,
              message.type === 'success' ? styles.messageSuccess : styles.messageError,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  inner: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
  },
  messageBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  messageError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  messageText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

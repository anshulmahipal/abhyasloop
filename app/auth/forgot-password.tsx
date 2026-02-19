import { useState } from 'react';
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    setMessage(null);
    setIsLoading(true);
    const appUrl =
      typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_URL?.trim()
        ? process.env.EXPO_PUBLIC_APP_URL.trim().replace(/\/$/, '')
        : 'https://app.tyariwale.com';
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${appUrl}/auth`,
    });
    setIsLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({
      type: 'success',
      text: 'If an account exists for this email, you will receive a password reset link.',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (message) setMessage(null);
          }}
          keyboardType="email-address"
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
            <Text style={styles.buttonText}>Send reset link</Text>
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
  inner: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
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

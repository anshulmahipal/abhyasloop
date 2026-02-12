import { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    console.log('handleAuth called, mode:', mode);
    console.log('Form values:', { 
      email, 
      emailLength: email.length,
      password, 
      passwordLength: password.length,
      passwordType: typeof password,
      fullName, 
      mode 
    });
    
    // Validate inputs
    if (!email || !email.trim()) {
      console.log('Validation failed: email empty');
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password || password.length === 0 || !password.trim()) {
      console.log('Validation failed: password empty', { 
        password, 
        passwordLength: password?.length,
        passwordTrimmed: password?.trim() 
      });
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log('Validation failed: invalid email format');
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      console.log('Validation failed: password too short');
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Full name validation for sign up
    if (mode === 'signup' && !fullName.trim()) {
      console.log('Validation failed: full name empty');
      Alert.alert('Error', 'Please enter your full name');
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
          Alert.alert('Sign In Failed', error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Success - navigate to dashboard
          router.replace('/(protected)/dashboard');
        }
      } else {
        // Sign up with full_name in metadata
        console.log('Attempting sign up...');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        console.log('Sign up response:', { data, error });

        if (error) {
          console.error('Sign up error:', error);
          Alert.alert('Sign Up Failed', error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          console.log('Sign up successful, user ID:', data.user.id);
          // Show verification alert - do NOT redirect
          Alert.alert(
            'Verification Email Sent',
            'Please check your inbox to activate your account.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Alert dismissed, switching to sign in mode');
                  // Switch to sign in mode after alert
                  setMode('signin');
                  setEmail(email.trim());
                  setPassword('');
                  setFullName('');
                },
              },
            ]
          );
        } else {
          console.error('Sign up succeeded but no user data');
          Alert.alert('Error', 'Account creation failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error message:', errorMessage);
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    console.log('Toggle mode pressed, current mode:', mode);
    const newMode = mode === 'signin' ? 'signup' : 'signin';
    console.log('Switching to mode:', newMode);
    setMode(newMode);
    // Clear password when switching modes
    setPassword('');
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

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        isMobile && styles.scrollContentMobile,
      ]}
    >
      <View style={[styles.container, isMobile && styles.containerMobile]}>
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>Tyariwala</Text>

          {/* Form */}
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
                  onChangeText={setFullName}
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
                onChangeText={setEmail}
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
                  console.log('Password onChangeText called with:', text.length, 'characters');
                  setPassword(text);
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
              {/* Debug: Show password length (remove in production) */}
              {__DEV__ && password.length > 0 && (
                <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {password.length} characters
                </Text>
              )}
            </View>

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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 32,
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
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#007AFF',
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
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
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
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
});

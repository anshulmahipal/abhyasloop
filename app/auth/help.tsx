import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const HELP_CENTER_URL = 'https://tyariwale.com'; // Update to your help center when available
const SUPPORT_EMAIL = 'mailto:support@tyariwale.com?subject=Account%20Recovery';

export default function AuthHelpScreen() {
  const router = useRouter();

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  const handleForgotEmail = () => {
    Alert.alert(
      'Forgot email address',
      'Please contact our support team with your Full Name and Mobile Number. We will help you locate your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email Support', onPress: () => Linking.openURL(SUPPORT_EMAIL) },
      ]
    );
  };

  const handleHelpCenter = () => {
    Linking.openURL(HELP_CENTER_URL).catch((err) => {
      console.error('Failed to open Help Center:', err);
      Alert.alert('Error', 'Unable to open the link.');
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        {/* Option 1: Forgot Password */}
        <TouchableOpacity style={styles.card} onPress={handleForgotPassword} activeOpacity={0.8}>
          <Ionicons name="key-outline" size={24} color="#059669" style={styles.cardIcon} />
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Forgot password</Text>
            <Text style={styles.cardSubtext}>Reset your password via email</Text>
          </View>
        </TouchableOpacity>

        {/* Option 2: Forgot Email */}
        <TouchableOpacity style={styles.card} onPress={handleForgotEmail} activeOpacity={0.8}>
          <Ionicons name="mail-outline" size={24} color="#059669" style={styles.cardIcon} />
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>I forgot my email address</Text>
            <Text style={styles.cardSubtext}>Get help from support to find your account</Text>
          </View>
        </TouchableOpacity>

        {/* Option 3: Help Center */}
        <TouchableOpacity style={styles.card} onPress={handleHelpCenter} activeOpacity={0.8}>
          <Ionicons name="help-circle-outline" size={24} color="#059669" style={styles.cardIcon} />
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Visit our Help Center</Text>
            <Text style={styles.cardSubtext}>FAQs and guides on the website</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 24,
  },
  content: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    marginRight: 16,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cardSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});

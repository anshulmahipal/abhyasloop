import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function LoginPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login/Signup Screen</Text>
      <Link href="/(protected)/dashboard" style={styles.link}>
        <Text>Go to Dashboard</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  link: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
});

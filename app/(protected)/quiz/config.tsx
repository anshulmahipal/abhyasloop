import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function QuizConfigPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz Configuration</Text>
      <Link href="/(protected)/quiz/1" style={styles.link}>
        <Text>Start Quiz (ID: 1)</Text>
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

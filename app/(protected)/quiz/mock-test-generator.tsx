import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MockTestGenerator } from '../../../components/MockTestGenerator';
import { useAuth } from '../../../contexts/AuthContext';

export default function MockTestGeneratorScreen() {
  const params = useLocalSearchParams<{
    difficulty?: string;
    examType?: string;
  }>();
  const router = useRouter();
  const { profile } = useAuth();

  const difficulty = (params.difficulty === 'easy' || params.difficulty === 'hard'
    ? params.difficulty
    : 'medium') as 'easy' | 'medium' | 'hard';
  const examType = params.examType || profile?.current_focus || 'Full Mock Test';
  const userFocus = profile?.current_focus || 'General Knowledge';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{examType}</Text>
        <Text style={styles.subtitle}>Physics • Chemistry • Math • GK • 10 questions each</Text>
      </View>
      <MockTestGenerator
        difficulty={difficulty}
        userFocus={userFocus}
        examType={examType}
        onStart={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
});

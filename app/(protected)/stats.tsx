import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatsScreen() {
  const totalTests = 12;
  const averageScore = '78%';

  const recentMocks = [
    'SSC CGL Mock 1 - 45/50',
    'Banking Quant Mock 2 - 38/50',
    'UPSC Prelims Practice - 72/100',
  ];

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Your Performance</Text>

        <View style={styles.overviewGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Tests Taken</Text>
            <Text style={styles.cardValue}>{totalTests}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Average Score</Text>
            <Text style={styles.cardValue}>{averageScore}</Text>
          </View>
        </View>

        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>Performance Graph Coming Soon</Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Mock Tests</Text>
        {recentMocks.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listItemText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  listItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listItemText: {
    fontSize: 15,
    color: '#374151',
  },
});

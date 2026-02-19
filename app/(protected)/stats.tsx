import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, shadow } from '../../constants/theme';
import { MockTestInfoCard } from '../../components/MockTestInfoCard';

type RecentMock = { title: string; score: number; total: number; date: string };

export default function StatsScreen() {
  const totalTests = 12;
  const averageScore = '78%';

  const recentMocks: RecentMock[] = [
    { title: 'SSC CGL Mock 1', score: 45, total: 50, date: 'Feb 18, 2026' },
    { title: 'Banking Quant Mock 2', score: 38, total: 50, date: 'Feb 17, 2026' },
    { title: 'UPSC Prelims Practice', score: 72, total: 100, date: 'Feb 16, 2026' },
  ];

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Your Performance</Text>

        <View style={styles.overviewGrid}>
          <View style={[styles.card, styles.cardInner]}>
            <Text style={styles.cardLabel}>Total Tests Taken</Text>
            <Text style={styles.cardValue}>{totalTests}</Text>
          </View>
          <View style={[styles.card, styles.cardInner]}>
            <Text style={styles.cardLabel}>Average Score</Text>
            <Text style={styles.cardValue}>{averageScore}</Text>
          </View>
        </View>

        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>Performance Graph Coming Soon</Text>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Mock Tests</Text>
          <View style={styles.list}>
            {recentMocks.map((item, index) => (
              <MockTestInfoCard
                key={index}
                title={item.title}
                score={item.score}
                total={item.total}
                date={item.date}
                onPress={() => {}}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screen,
    paddingBottom: spacing.screenBottom,
    gap: spacing.xxl,
  },
  title: {
    ...typography.title,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInner: {
    gap: spacing.sm,
  },
  cardLabel: {
    ...typography.cardLabel,
  },
  cardValue: {
    ...typography.cardValue,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    ...typography.placeholder,
  },
  recentSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  list: {
    gap: spacing.lg,
  },
});

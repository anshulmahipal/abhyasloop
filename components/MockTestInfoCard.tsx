import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadow } from '../constants/theme';

export interface MockTestInfoCardProps {
  title: string;
  score: number;
  total: number;
  date: string;
  onPress: () => void;
}

/**
 * Standard card for mock test info across the app: icon, title, score/total • date, chevron.
 */
export function MockTestInfoCard({ title, score, total, date, onPress }: MockTestInfoCardProps) {
  const subtitle = `${score}/${total} • ${date}`;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name="layers" size={22} color={colors.mockTestIcon} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mockTestChevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    ...shadow.mockTestCard,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mockTestIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  title: {
    ...typography.mockTestCardTitle,
  },
  subtitle: {
    ...typography.mockTestCardSubtitle,
  },
});

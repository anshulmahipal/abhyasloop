import { View, Text, StyleSheet } from 'react-native';

interface DifficultyBadgeProps {
  difficulty: 'easy' | 'medium' | 'hard';
  /** Section name (e.g. Physics, Chemistry) for full mock tests; shown as "Section • Difficulty" */
  section?: string;
}

const difficultyColors = {
  easy: '#059669',
  medium: '#d97706',
  hard: '#dc2626',
};

export function DifficultyBadge({ difficulty, section }: DifficultyBadgeProps) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.badge, { backgroundColor: difficultyColors[difficulty] }]}>
        {section ? `${section} • ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}` : difficulty.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

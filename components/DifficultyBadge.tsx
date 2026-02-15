import { Text, StyleSheet } from 'react-native';

interface DifficultyBadgeProps {
  difficulty: 'easy' | 'medium' | 'hard';
}

const difficultyColors = {
  easy: '#059669',
  medium: '#d97706',
  hard: '#dc2626',
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <Text style={[styles.badge, { backgroundColor: difficultyColors[difficulty] }]}>
      {difficulty.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

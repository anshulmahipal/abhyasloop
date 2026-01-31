import { Text, StyleSheet } from 'react-native';

interface DifficultyBadgeProps {
  difficulty: 'easy' | 'medium' | 'hard';
}

const difficultyColors = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
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

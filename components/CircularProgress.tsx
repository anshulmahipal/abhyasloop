import { View, Text, StyleSheet } from 'react-native';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

export function CircularProgress({
  percentage,
  size = 150,
  strokeWidth = 16,
  color = '#007AFF',
  backgroundColor = '#e0e0e0',
}: CircularProgressProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  // For a simple visual representation, we'll use a filled circle approach
  // This creates a ring-like appearance by layering circles

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circleWrapper,
          {
            width: size,
            height: size,
          },
        ]}
      >
        {/* Outer background circle */}
        <View
          style={[
            styles.outerCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: backgroundColor,
            },
          ]}
        />
        
        {/* Progress fill circle */}
        {clampedPercentage > 0 && (
          <View
            style={[
              styles.progressCircle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: clampedPercentage / 100,
              },
            ]}
          />
        )}

        {/* Inner white circle to create ring effect */}
        <View
          style={[
            styles.innerCircle,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
              backgroundColor: '#ffffff',
            },
          ]}
        />

        {/* Percentage text */}
        <View style={styles.textOverlay}>
          <Text style={[styles.percentageText, { fontSize: size * 0.22 }]}>
            {Math.round(clampedPercentage)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',
  },
  progressCircle: {
    position: 'absolute',
  },
  innerCircle: {
    position: 'absolute',
  },
  textOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
});

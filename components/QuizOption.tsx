import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface QuizOptionProps {
  option: string;
  optionIndex: number;
  state: 'default' | 'selected' | 'correct' | 'incorrect';
  onPress: () => void;
  disabled: boolean;
  fontSize?: number;
}

export function QuizOption({
  option,
  optionIndex,
  state,
  onPress,
  disabled,
  fontSize = 18,
}: QuizOptionProps) {
  const optionLabel = String.fromCharCode(65 + optionIndex);

  return (
    <TouchableOpacity
      style={[styles.option, styles[`option${state.charAt(0).toUpperCase() + state.slice(1)}`]]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.optionText, styles[`optionText${state.charAt(0).toUpperCase() + state.slice(1)}`], { fontSize }]}>
        {optionLabel}. {option}
      </Text>
      {state === 'correct' && <Text style={styles.correctMark}>✓</Text>}
      {state === 'incorrect' && <Text style={styles.incorrectMark}>✗</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionDefault: {
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
  },
  optionSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  optionCorrect: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  optionIncorrect: {
    backgroundColor: '#ffebee',
    borderColor: '#F44336',
  },
  optionText: {
    fontSize: 18,
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  optionTextDefault: {
    color: '#333',
  },
  optionTextSelected: {
    color: '#333',
  },
  optionTextCorrect: {
    color: '#047857',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#c62828',
    fontWeight: '600',
  },
  correctMark: {
    fontSize: 24,
    color: '#059669',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  incorrectMark: {
    fontSize: 24,
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 12,
  },
});

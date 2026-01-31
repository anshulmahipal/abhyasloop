import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

// TODO: Add proper auth guard logic later
// For now, just render the slot
const isLoggedIn = true; // Placeholder - will be replaced with actual auth check

export default function ProtectedLayout() {
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please log in to access this section</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f4511e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="quiz" options={{ headerShown: false }} />
      <Stack.Screen name="result" options={{ title: 'Results' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

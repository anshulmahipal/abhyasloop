import { Stack } from 'expo-router';

export default function QuizLayout() {
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
      <Stack.Screen name="config" options={{ title: 'Quiz Configuration' }} />
      <Stack.Screen name="[id]" options={{ title: 'Quiz' }} />
    </Stack>
  );
}

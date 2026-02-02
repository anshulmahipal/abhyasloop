import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide headers - we use custom headers in components
      }}
    >
      <Stack.Screen name="config" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

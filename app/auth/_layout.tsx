import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="help"
        options={{
          headerShown: true,
          title: 'Trouble Logging In?',
          headerBackTitle: 'Back',
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: '#059669' },
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: true,
          title: 'Reset Password',
          headerBackTitle: 'Back',
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: '#059669' },
        }}
      />
      <Stack.Screen
        name="set-password"
        options={{
          headerShown: true,
          title: 'Set new password',
          headerBackTitle: 'Back',
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: '#059669' },
        }}
      />
    </Stack>
  );
}

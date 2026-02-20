import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const posthog = new PostHog(apiKey, {
  host,
  ...(apiKey ? {} : { disabled: true }),
  // Capture app lifecycle events (install, update, open, background)
  captureAppLifecycleEvents: true,
  // Enable debug mode in development for verbose logging
  debug: __DEV__,
});

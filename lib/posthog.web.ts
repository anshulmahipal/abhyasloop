import PostHog from 'posthog-js';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && apiKey) {
  PostHog.init(apiKey, {
    api_host: host,
    person_profiles: 'identified_only',
  });
}

export const posthog = {
  capture: (event: string, props?: object) => PostHog.capture(event, props),
  screen: (name: string, props?: object) =>
    PostHog.capture('$pageview', { $current_url: name, ...props }),
  identify: (distinctId: string, properties?: object) =>
    PostHog.identify(distinctId, properties as Record<string, unknown>),
  reset: () => PostHog.reset(),
};

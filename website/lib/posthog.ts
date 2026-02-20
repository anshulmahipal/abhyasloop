import posthog from 'posthog-js';

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && key) {
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // We capture pageviews manually so client-side navigations are tracked and $referring_domain is set correctly
    person_profiles: 'identified_only',
  });
}

export { posthog };

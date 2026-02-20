import { useEffect } from 'react';
import { PostHogProvider as PH, usePostHog } from 'posthog-react-native';
import { usePathname } from 'expo-router';
import { posthog } from '../lib/posthog';

function PostHogScreenTracker() {
  const client = usePostHog();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && client) {
      client.screen(pathname);
    }
  }, [pathname, client]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PH client={posthog}>
      <PostHogScreenTracker />
      {children}
    </PH>
  );
}

import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { posthog } from '../lib/posthog';

function PostHogScreenTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      posthog.screen(pathname);
    }
  }, [pathname]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogScreenTracker />
      {children}
    </>
  );
}

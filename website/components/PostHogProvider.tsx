'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { posthog } from '@/lib/posthog';

function PostHogPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && typeof window !== 'undefined') {
      const url = window.origin + pathname;
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogPageView />
      {children}
    </>
  );
}

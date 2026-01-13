'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import IS from '@/utils/is';

export default function MSWProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (IS.undefined(window) || process.env.NODE_ENV !== 'development') {
      setIsReady(true);
      return;
    }
    (async () => {
      const { worker } = await import('@/mocks/browser');
      await worker.start({
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
        onUnhandledRequest: (request, print) => {
          const url = new URL(request.url);
          if (
            url.pathname.startsWith('/__nextjs_') ||
            url.pathname.startsWith('/_next/') ||
            url.pathname === '/favicon.ico' ||
            url.pathname === '/manifest.json'
          )
            return;
          print.warning();
        },
      });
      setIsReady(true);
    })();
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}

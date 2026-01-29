"use client";

import { useCallback } from 'react';

type AnalyticsEvent = 'SEARCH' | 'CLICK' | 'WISHLIST';

export const useAnalytics = () => {
  const trackEvent = useCallback(async (type: AnalyticsEvent, data: Record<string, any>) => {
    try {
      // "keepalive: true" ensures the request completes even if the user 
      // navigates to a new page immediately after the click.
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
        keepalive: true,
      });
    } catch (err) {
      // Silently fail to avoid disrupting user experience
      if (process.env.NODE_ENV === 'development') {
        console.error('Analytics tracking failed:', err);
      }
    }
  }, []);

  return { trackEvent };
};
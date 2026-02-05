'use client';

import { useEffect } from 'react';

// Helper to convert Hex to RGB string (e.g., "37 99 235")
// This allows Tailwind to use opacity: bg-primary/20
const hexToRgbChannels = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (primary: string, accent: string) => {
      // 1. Set standard Hex variables
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--accent', accent);

      // 2. Set RGB Channel variables for Tailwind Opacity support
      // This enables classes like bg-primary/20 or shadow-accent/50
      root.style.setProperty('--primary-rgb', hexToRgbChannels(primary));
      root.style.setProperty('--accent-rgb', hexToRgbChannels(accent));
    };

    // 1. Check Local Storage first (Instant load to prevent flicker)
    const cachedPrimary = localStorage.getItem('theme_primary');
    const cachedAccent = localStorage.getItem('theme_accent');
    
    if (cachedPrimary && cachedAccent) {
      applyTheme(cachedPrimary, cachedAccent);
    }

    // 2. Fetch fresh data from DB (Background sync)
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const primary = data.primaryColor || '#2563eb';
          const accent = data.accentColor || '#ef4444';

          applyTheme(primary, accent);
          
          // Update Cache
          localStorage.setItem('theme_primary', primary);
          localStorage.setItem('theme_accent', accent);
        }
      })
      .catch(err => console.error("Theme fetch failed", err));
  }, []);

  return <>{children}</>;
}
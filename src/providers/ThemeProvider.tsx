'use client';

import { useEffect } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Check Local Storage first (Instant load)
    const cachedPrimary = localStorage.getItem('theme_primary');
    const cachedAccent = localStorage.getItem('theme_accent');
    
    if (cachedPrimary) document.documentElement.style.setProperty('--primary', cachedPrimary);
    if (cachedAccent) document.documentElement.style.setProperty('--accent', cachedAccent);

    // 2. Fetch fresh data from DB (in case admin changed it)
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const primary = data.primaryColor || '#2563eb';
          const accent = data.accentColor || '#ef4444';

          document.documentElement.style.setProperty('--primary', primary);
          document.documentElement.style.setProperty('--accent', accent);
          
          // Update Cache
          localStorage.setItem('theme_primary', primary);
          localStorage.setItem('theme_accent', accent);
        }
      })
      .catch(err => console.error("Theme fetch failed", err));
  }, []);

  return <>{children}</>;
}
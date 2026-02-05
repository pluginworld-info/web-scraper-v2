import { Inter } from 'next/font/google';
import Header from '@/components/Header'; 
import ThemeProvider from '@/providers/ThemeProvider'; 
import { prisma } from '@/lib/db/prisma'; 
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Helper to convert Hex to RGB channels for Tailwind Opacity support
const hexToRgbChannels = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

export async function generateMetadata() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    return {
      title: settings?.siteName || 'Plugin Deals Tracker',
      description: settings?.description || 'Real-time price tracking for audio plugins',
      icons: {
        icon: settings?.faviconUrl || '/favicon.ico', 
      },
    };
  } catch (e) {
    return {
      title: 'Plugin Deals Tracker',
      description: 'Real-time price tracking for audio plugins',
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let themeStyle = {} as React.CSSProperties;
  
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (settings) {
        const p = settings.primaryColor || '#2563eb';
        const a = settings.accentColor || '#ef4444';

        themeStyle = {
            '--primary': p,
            '--accent': a,
            '--primary-rgb': hexToRgbChannels(p),
            '--accent-rgb': hexToRgbChannels(a),
        } as React.CSSProperties;
    }
  } catch (e) {
    console.error("Failed to load theme settings", e);
  }

  return (
    <html lang="en">
      <head>
        {/* ✅ THE FLICKER-FIX SCRIPT
            This runs before the page renders to apply cached theme colors instantly.
        */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const p = localStorage.getItem('theme_primary');
              const a = localStorage.getItem('theme_accent');
              if (p && a) {
                const root = document.documentElement;
                root.style.setProperty('--primary', p);
                root.style.setProperty('--accent', a);
                
                const toRgb = (hex) => {
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  return r + " " + g + " " + b;
                };
                
                root.style.setProperty('--primary-rgb', toRgb(p));
                root.style.setProperty('--accent-rgb', toRgb(a));
              }
            } catch (e) {}
          })()
        ` }} />
      </head>
      <body 
        className={`${inter.className} bg-[#111] text-white selection:bg-primary/30`} 
        style={themeStyle}
      >
        <ThemeProvider>
          <Header /> 
          {/* ✅ DARK THEME BACKGROUND */}
          <main className="min-h-screen bg-[#111]">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
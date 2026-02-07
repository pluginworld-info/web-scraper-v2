import { Inter } from 'next/font/google';
import Header from '@/components/Header'; 
import ThemeProvider from '@/providers/ThemeProvider'; 
import { prisma } from '@/lib/db/prisma'; 
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Helper to convert Hex to RGB channels for Tailwind Opacity support
const hexToRgbChannels = (hex: string): string => {
  // Handle shorthand hex (e.g. #FFF)
  const fullHex = hex.length === 4 
    ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] 
    : hex;
    
  const r = parseInt(fullHex.slice(1, 3), 16);
  const g = parseInt(fullHex.slice(3, 5), 16);
  const b = parseInt(fullHex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

export async function generateMetadata() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    
    return {
      title: settings?.siteName || 'Plugin Deals Tracker',
      description: settings?.description || 'Real-time price tracking for audio plugins',
      icons: {
        // ✅ DYNAMIC FAVICON: Falls back to default if not set
        icon: settings?.faviconUrl || '/favicon.ico', 
        shortcut: settings?.faviconUrl || '/favicon.ico',
        apple: settings?.faviconUrl || '/favicon.ico',
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
        {/* ✅ THE FLICKER-FIX SCRIPT: Prevents "Flash of Default Color" */}
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
                  const fullHex = hex.length === 4 
                    ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] 
                    : hex;
                  const r = parseInt(fullHex.slice(1, 3), 16);
                  const g = parseInt(fullHex.slice(3, 5), 16);
                  const b = parseInt(fullHex.slice(5, 7), 16);
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
          <main className="min-h-screen bg-[#111]">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
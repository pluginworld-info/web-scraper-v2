import { Inter } from 'next/font/google';
import Header from '@/components/Header'; 
import ThemeProvider from '@/providers/ThemeProvider'; 
import { prisma } from '@/lib/db/prisma'; 
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// 1. DYNAMIC METADATA (Keep this, it's perfect)
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

// 2. SERVER-SIDE THEME INJECTION
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch settings directly on the server
  let themeStyle = {};
  
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (settings) {
        // Prepare the CSS variables object
        themeStyle = {
            '--primary': settings.primaryColor || '#2563eb', // Default Blue
            '--accent': settings.accentColor || '#ef4444',   // Default Red
        } as React.CSSProperties;
    }
  } catch (e) {
    console.error("Failed to load theme settings", e);
  }

  return (
    <html lang="en">
      {/* 3. INJECT VARIABLES HERE
         We apply the style directly to the body. 
         Tailwind will see these variables and map them to bg-primary / bg-accent immediately.
      */}
      <body className={inter.className} style={themeStyle}>
        <ThemeProvider>
          <Header /> 
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
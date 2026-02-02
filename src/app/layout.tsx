import { Inter } from 'next/font/google';
import Header from '@/components/Header'; 
import ThemeProvider from '@/providers/ThemeProvider'; 
import { prisma } from '@/lib/db/prisma'; // ✅ Import Prisma
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// ✅ DYNAMIC METADATA: Fetches Site Name for the Browser Tab
export async function generateMetadata() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    
    return {
      title: settings?.siteName || 'Plugin Deals Tracker',
      description: settings?.description || 'Real-time price tracking for audio plugins',
      icons: {
        icon: settings?.faviconUrl || '/favicon.ico', // Optional: if you add favicon support later
      },
    };
  } catch (e) {
    // Fallback if DB fails
    return {
      title: 'Plugin Deals Tracker',
      description: 'Real-time price tracking for audio plugins',
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ✅ WRAP WITH THEME PROVIDER */}
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
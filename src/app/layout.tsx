import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

// 🔴 CRITICAL: This import applies CSS to the whole site
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Plugin Deals Tracker',
  description: 'Real-time price tracking for audio plugins',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
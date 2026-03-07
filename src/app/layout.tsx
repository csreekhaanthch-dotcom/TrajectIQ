import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TrajectIQ - Hiring Intelligence Platform',
  description: 'AI-powered email-driven hiring intelligence SaaS platform for deterministic candidate evaluation',
  keywords: ['hiring', 'recruitment', 'AI', 'resume parsing', 'candidate scoring', 'ATS'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

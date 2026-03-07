import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Primary font - Inter for UI
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

// Monospace font - JetBrains Mono for code/numbers
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'TrajectIQ - Hiring Intelligence Platform',
    template: '%s | TrajectIQ',
  },
  description: 'AI-powered email-driven hiring intelligence SaaS platform for deterministic candidate evaluation. Streamline your recruitment with intelligent scoring.',
  keywords: [
    'hiring', 
    'recruitment', 
    'AI', 
    'resume parsing', 
    'candidate scoring', 
    'ATS',
    'HR software',
    'talent acquisition',
    'recruiting platform',
    'candidate evaluation'
  ],
  authors: [{ name: 'TrajectIQ' }],
  creator: 'TrajectIQ',
  publisher: 'TrajectIQ',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'TrajectIQ',
    title: 'TrajectIQ - Hiring Intelligence Platform',
    description: 'AI-powered email-driven hiring intelligence SaaS platform for deterministic candidate evaluation.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TrajectIQ Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrajectIQ - Hiring Intelligence Platform',
    description: 'AI-powered email-driven hiring intelligence SaaS platform for deterministic candidate evaluation.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

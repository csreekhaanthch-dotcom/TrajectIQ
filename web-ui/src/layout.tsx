import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrajectIQ Enterprise v3.0.0 - Intelligence-Driven Hiring",
  description: "AI-powered hiring intelligence platform for comprehensive candidate evaluation and recruitment analytics. Deterministic scoring, encrypted storage, and enterprise-grade security.",
  keywords: ["TrajectIQ", "Hiring", "Recruitment", "AI", "Candidate Evaluation", "HR Analytics", "Talent Intelligence", "Resume Screening", "Enterprise HR"],
  authors: [{ name: "TrajectIQ Team" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-new.png", sizes: "1024x1024", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon-new.png",
  },
  openGraph: {
    title: "TrajectIQ Enterprise - Intelligence-Driven Hiring",
    description: "AI-powered hiring intelligence platform with deterministic scoring, encrypted storage, and enterprise-grade security",
    url: "https://trajectiq.com",
    siteName: "TrajectIQ",
    type: "website",
    images: [
      {
        url: "/favicon-new.png",
        width: 1024,
        height: 1024,
        alt: "TrajectIQ Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrajectIQ Enterprise",
    description: "Intelligence-Driven Hiring Platform",
    images: ["/favicon-new.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

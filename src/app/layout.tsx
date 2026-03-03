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
  title: "TrajectIQ - Intelligence-Driven Hiring Dashboard",
  description: "AI-powered hiring intelligence platform for comprehensive candidate evaluation and recruitment analytics. Built with Next.js and TypeScript.",
  keywords: ["TrajectIQ", "Hiring", "Recruitment", "AI", "Candidate Evaluation", "HR Analytics", "Talent Intelligence"],
  authors: [{ name: "TrajectIQ Team" }],
  icons: {
    icon: "/trajjectiq-logo.png",
  },
  openGraph: {
    title: "TrajectIQ Dashboard",
    description: "Intelligence-Driven Hiring Platform",
    url: "https://trajectiq.com",
    siteName: "TrajectIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrajectIQ Dashboard",
    description: "Intelligence-Driven Hiring Platform",
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

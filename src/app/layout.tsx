import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrajectIQ - Intelligence-Driven Hiring",
  description: "AI-powered hiring intelligence platform for comprehensive candidate evaluation and recruitment analytics. Built with Next.js and TypeScript.",
  keywords: ["TrajectIQ", "Hiring", "Recruitment", "AI", "Candidate Evaluation", "HR Analytics", "Talent Intelligence"],
  authors: [{ name: "TrajectIQ Team" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/trajectiq-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/trajectiq-icon.svg",
  },
  openGraph: {
    title: "TrajectIQ - Intelligence-Driven Hiring",
    description: "AI-powered hiring intelligence platform for comprehensive candidate evaluation and recruitment analytics.",
    url: "https://trajectiq.com",
    siteName: "TrajectIQ",
    type: "website",
    images: [
      {
        url: "/trajectiq-logo.png",
        width: 1200,
        height: 630,
        alt: "TrajectIQ - Intelligence-Driven Hiring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrajectIQ - Intelligence-Driven Hiring",
    description: "AI-powered hiring intelligence platform for comprehensive candidate evaluation.",
    images: ["/trajectiq-logo.png"],
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
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground font-sans`}
        style={{ fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

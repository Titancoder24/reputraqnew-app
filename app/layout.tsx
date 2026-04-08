import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Reputraq — Your Reputation Matters",
    template: "%s | Reputraq",
  },
  description:
    "AI-powered media monitoring and brand intelligence platform. Track brand mentions, analyze sentiment, compare competitors, and protect your reputation in real-time.",
  keywords: [
    "media monitoring",
    "brand intelligence",
    "reputation management",
    "sentiment analysis",
    "competitor tracking",
    "share of voice",
    "PR monitoring",
  ],
  authors: [{ name: "Orion Digital" }],
  creator: "Orion Digital",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Reputraq",
    title: "Reputraq — Your Reputation Matters",
    description:
      "AI-powered media monitoring and brand intelligence platform. Track mentions, analyze sentiment, compare competitors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reputraq — Your Reputation Matters",
    description:
      "AI-powered media monitoring and brand intelligence platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0093DD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-white text-brand-charcoal">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

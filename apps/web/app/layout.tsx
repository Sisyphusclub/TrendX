import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans, Space_Grotesk } from "next/font/google";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Providers } from "./providers";

import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const bodyFont = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TrendX",
  description: "Directional crypto automation dashboard for TrendX MVP.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps): ReactElement {
  return (
    <html
      className={cn(displayFont.variable, monoFont.variable, bodyFont.variable)}
      lang="zh-CN"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

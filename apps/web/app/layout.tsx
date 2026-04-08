import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Manrope } from "next/font/google";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Providers } from "./providers";

import "./globals.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["500", "600", "700", "800"],
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
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

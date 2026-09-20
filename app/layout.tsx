import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChildBloom AI Rewriter — Pediatric Content Studio",
  description: "A private, installable workspace for creating evidence-based pediatric health and parenting content.",
  applicationName: "ChildBloom Rewriter",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.svg" },
  appleWebApp: { capable: true, title: "ChildBloom Rewriter", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f8f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}


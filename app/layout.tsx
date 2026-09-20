import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChildBloom AI Rewriter — Pediatric Content Studio",
  description: "AI-powered article rewriter for pediatric health, baby care, and parenting content. Evidence-based, E-E-A-T compliant, SEO-optimized.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

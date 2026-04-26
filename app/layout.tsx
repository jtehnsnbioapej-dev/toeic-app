import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "PetEnglish",
  description: "ペットと一緒に英語を学ぼう",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#38B2F0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full antialiased max-w-md mx-auto" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

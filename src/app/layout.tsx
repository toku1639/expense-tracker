import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "家計簿",
  description: "日々の支出を素早く記録する個人用家計簿アプリ",
  manifest: "/manifest.webmanifest",
  applicationName: "家計簿",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "家計簿",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192x192.svg", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSans.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

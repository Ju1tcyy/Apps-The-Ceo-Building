import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#142D4E",
};

export const metadata: Metadata = {
  title: "The CEO Building Management System",
  description: "One Platform. Total Control. Smart Building Operations for a More Efficient Tomorrow.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The CEO",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-background text-appText antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Beyond Happiness",
  description: "Beyond Happiness Survey Management System - Empowering organizations to measure and improve workplace happiness",
  icons: {
    icon: [
      { url: '/beyond-happiness-logo.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/beyond-happiness-logo.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  );
}

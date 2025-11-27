import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
      <body className="font-sans antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WW Let's Doodle",
  description: "Wiom Wednesday Doodle Challenge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f0f1a]">{children}</body>
    </html>
  );
}

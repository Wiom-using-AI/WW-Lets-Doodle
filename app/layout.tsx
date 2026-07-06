import type { Metadata } from "next";
import { Fredoka, Gaegu } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fredoka" });
const gaegu = Gaegu({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-gaegu" });

export const metadata: Metadata = {
  title: "WW Let's Doodle",
  description: "Wiom Wednesday Doodle Challenge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${gaegu.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

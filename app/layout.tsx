import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Oswald } from "next/font/google";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AlbaLink 社内ポータル",
  description: "アルバリンク 社内情報ポータルサイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${oswald.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#EFF2F4] font-zen text-[#192E61]">
        {children}
      </body>
    </html>
  );
}

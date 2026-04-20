import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockSane — Sanity-check your trades",
  description: "Don't lose money making dumb stock decisions. StockSane checks your trade before you hit buy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0f172a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}

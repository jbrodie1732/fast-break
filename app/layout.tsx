import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fast-BREAK - Flow Blockchain",
  description: "Randomly assign NBA Top Shot usernames to NBA teams using Flow's on-chain randomness",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


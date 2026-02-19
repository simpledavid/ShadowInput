import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShadowInput — YouTube English Learning",
  description: "Learn English by watching your YouTube subscriptions with interactive transcripts and AI explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

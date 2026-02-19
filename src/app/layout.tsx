import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShadowInput | YouTube 字幕学习插件",
  description: "支持悬停暂停查词、双语字幕、生词收藏导出的 YouTube 学习插件。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

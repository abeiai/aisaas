import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@incremark/theme/styles.css";
import "katex/dist/katex.min.css";
import "vditor/dist/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI SaaS 内容工具站底座",
  description: "面向中国市场的简体中文 AI SaaS / 内容型工具站工程骨架。",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

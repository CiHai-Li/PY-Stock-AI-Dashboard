import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "证析 AI｜可验证股票研究助手",
  description: "用确定性评分、证据溯源、历史校准和组合风险，让 AI 投研结论可核验。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "./_components/register-sw";

export const metadata: Metadata = {
  title: "Koubo · 口播视频稿管理",
  description: "管理品牌下的口播视频稿，AI 优化与品牌内相似度发现。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Koubo",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

const THEME_INIT = `
(function(){try{
  var s=localStorage.getItem('koubo:theme');
  var dark = s==='dark' || (s!=='light' && matchMedia('(prefers-color-scheme: dark)').matches);
  if(dark) document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

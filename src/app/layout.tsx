import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "plan.0",
  description: "개인용 할 일 · 캘린더 · PARA 관리 웹앱",
  // 아이폰 홈 화면에 추가했을 때(웹앱) — 이름 · 상태 막대. 홈 아이콘은 app/apple-icon.png, 나머지는 app/manifest.ts
  appleWebApp: {
    capable: true,
    title: "plan.0",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // 홈 인디케이터 영역까지 그리고, 하단 탭바는 env(safe-area-inset-bottom)만큼 띄운다 (globals.css --tabbar-h)
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full antialiased`}>
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

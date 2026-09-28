import type { MetadataRoute } from "next";

/** 홈 화면에 추가한 웹앱(아이폰 · 안드로이드)의 이름 · 시작 화면 · 아이콘. WEBAPP-PLAN.md 1단계 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "plan.0",
    short_name: "plan.0",
    description: "개인용 할 일 · 캘린더 · PARA 관리 웹앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

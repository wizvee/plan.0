"use client";

import { useEffect } from "react";

/**
 * `public/sw.js`(웹 푸시 · 배지)를 등록한다. 화면에 아무것도 그리지 않는다.
 * 루트 레이아웃에서 한 번만 렌더링 — 로그인 화면에서도 등록돼 있어야 알림을 누른 뒤 앱이 열린다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // updateViaCache: "none" — sw.js를 HTTP 캐시 없이 매번 확인해 수정본이 바로 반영되게
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // 등록 실패해도 앱 사용에는 지장 없음 (알림만 안 됨)
    });
  }, []);

  return null;
}

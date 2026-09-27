"use client";

import type { ReactNode } from "react";

import { ShellUIProvider } from "@/components/shell/shell-ui-context";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppNavRail } from "@/components/shell/app-nav-rail";
import { DriveStatusBanner } from "@/components/shell/drive-status-banner";

/**
 * 로그인 후 모든 화면이 공유하는 앱 셸 — 사이드바(모바일은 보관함 바텀시트) · 하단 탭 · Drive 연결 결과.
 * `(app)/layout.tsx`에서 한 번만 렌더링되므로 화면이 바뀌어도 언마운트되지 않는다.
 *
 * 규칙: 화면(page · 화면 컴포넌트)은 `components/shell/*`을 import하지 않는다(eslint로 강제).
 * 화면은 `children`으로 오른쪽 본문만 그린다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellUIProvider>
      <div className="min-h-screen pb-14 sm:pb-0 sm:pl-[260px]">
        <DriveStatusBanner />
        {children}
      </div>
      <AppSidebar />
      <AppNavRail />
    </ShellUIProvider>
  );
}

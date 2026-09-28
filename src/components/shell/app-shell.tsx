"use client";

import { useCallback, useState, type ReactNode } from "react";

import { ShellUIProvider } from "@/lib/shell-ui";
import { AppRail } from "@/components/shell/app-rail";
import { InboxPanel } from "@/components/shell/inbox-panel";
import { AccountMenu } from "@/components/shell/account-menu";
import { DriveStatusBanner } from "@/components/shell/drive-status-banner";

/**
 * 로그인 후 모든 화면이 공유하는 앱 셸: 레일(모바일은 하단 탭) | Inbox 패널 | 본문.
 * `(app)/layout.tsx`에서 한 번만 렌더링되므로 화면이 바뀌어도 언마운트되지 않는다.
 * 데스크톱에서 Inbox는 팝업이 아니라 본문을 오른쪽으로 밀어낸다(본문 왼쪽이 가려지지 않음).
 *
 * 규칙: 화면(page · 화면 컴포넌트)은 `components/shell/*`을 import하지 않는다(eslint로 강제).
 * 화면은 `children`으로 오른쪽 본문만 그린다. Inbox를 열어야 하면 `useShellUI()`를 쓴다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const closeAccount = useCallback(() => setAccountOpen(false), []);

  return (
    <ShellUIProvider>
      <div className="flex min-h-screen w-full">
        <AppRail accountOpen={accountOpen} onToggleAccount={() => setAccountOpen((open) => !open)} />
        <InboxPanel />
        <main className="min-w-0 flex-1 pb-[var(--tabbar-h)] sm:pb-0">
          <DriveStatusBanner />
          {children}
        </main>
      </div>
      <AccountMenu open={accountOpen} onClose={closeAccount} />
    </ShellUIProvider>
  );
}

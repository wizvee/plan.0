"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ShellUI {
  /** 모바일 보관함 바텀시트가 열려 있는지 (데스크톱 사이드바는 항상 보임) */
  inboxOpen: boolean;
  setInboxOpen: (open: boolean) => void;
  toggleInbox: () => void;
}

const ShellUIContext = createContext<ShellUI | null>(null);

/** 셸(사이드바 · 하단 탭) UI 상태. 레이아웃에 한 번 있으므로 화면을 옮겨도 유지된다. */
export function ShellUIProvider({ children }: { children: ReactNode }) {
  const [inboxOpen, setInboxOpen] = useState(false);
  return (
    <ShellUIContext.Provider value={{ inboxOpen, setInboxOpen, toggleInbox: () => setInboxOpen((open) => !open) }}>
      {children}
    </ShellUIContext.Provider>
  );
}

export function useShellUI(): ShellUI {
  const value = useContext(ShellUIContext);
  if (!value) throw new Error("useShellUI는 ShellUIProvider 안에서만 쓸 수 있습니다.");
  return value;
}

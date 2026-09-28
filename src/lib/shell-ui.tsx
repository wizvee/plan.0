"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "plan0.inboxOpen";
const CHANGE_EVENT = "plan0:inbox-open-change";

// Inbox 열림 여부는 이 브라우저의 localStorage에 둔다. 서버 렌더에선 항상 닫힘(false)이라 하이드레이션이 어긋나지 않는다.
// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리 값으로 동작한다.
let memoryInboxOpen = false;

function readInboxOpen(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? memoryInboxOpen : stored === "1";
  } catch {
    return memoryInboxOpen;
  }
}

function subscribeInboxOpen(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

interface ShellUI {
  /** Inbox 패널이 열려 있는지 (데스크톱: 캘린더를 밀어내는 패널, 모바일: 바텀시트) */
  inboxOpen: boolean;
  setInboxOpen: (open: boolean) => void;
  toggleInbox: () => void;
  /** Inbox를 열고 "새 할 일" 입력창에 포커스한다 (캘린더 툴바의 + 버튼) */
  openInboxForAdd: () => void;
  /** openInboxForAdd가 호출될 때마다 바뀌는 값 — Inbox 패널이 이걸 보고 입력창에 포커스한다 */
  focusRequest: number;
}

const ShellUIContext = createContext<ShellUI | null>(null);

/**
 * 셸 UI 상태. 셸(`AppShell`)이 레이아웃에서 한 번만 마운트하므로 화면을 옮겨도 유지된다.
 * 화면은 `useShellUI()`로 Inbox를 열 수만 있고, 셸의 모양/구성은 바꿀 수 없다.
 * Inbox 열림 여부는 이 브라우저에 기억한다(다음 방문 때도 같은 상태로).
 */
export function ShellUIProvider({ children }: { children: ReactNode }) {
  const inboxOpen = useSyncExternalStore(subscribeInboxOpen, readInboxOpen, () => false);
  const [focusRequest, setFocusRequest] = useState(0);

  const setInboxOpen = useCallback((open: boolean) => {
    memoryInboxOpen = open;
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      // 저장 못 해도 메모리 값으로 이번 방문 동안은 동작한다
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value: ShellUI = {
    inboxOpen,
    setInboxOpen,
    toggleInbox: () => setInboxOpen(!inboxOpen),
    openInboxForAdd: () => {
      setInboxOpen(true);
      setFocusRequest((n) => n + 1);
    },
    focusRequest,
  };

  return <ShellUIContext.Provider value={value}>{children}</ShellUIContext.Provider>;
}

export function useShellUI(): ShellUI {
  const value = useContext(ShellUIContext);
  if (!value) throw new Error("useShellUI는 ShellUIProvider 안에서만 쓸 수 있습니다.");
  return value;
}

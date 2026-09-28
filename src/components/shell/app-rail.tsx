"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Inbox, LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import { mondayOf, toDateKey } from "@/lib/week";
import { useSession } from "@/lib/app-data/app-data-provider";
import { useTodos } from "@/lib/app-data/use-todos";
import { useShellUI } from "@/lib/shell-ui";

/**
 * 앱 내비게이션 — 데스크톱은 왼쪽 세로 레일(76px), 모바일은 하단 탭바. 한 컴포넌트가 반응형으로
 * 모양만 바꾼다. 항목: 캘린더 · PARA · Inbox(열기/닫기) · 계정(메뉴).
 */
export function AppRail({ accountOpen, onToggleAccount }: { accountOpen: boolean; onToggleAccount: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userEmail, googleConnected } = useSession();
  const { backlogItems } = useTodos();
  const { inboxOpen, toggleInbox } = useShellUI();

  const onPara = pathname.startsWith("/para");

  // "캘린더"는 항상 이번 주 주 보기로. 이미 캘린더 화면이면 히스토리를 쌓지 않는다.
  function goCalendar() {
    const url = `/?week=${toDateKey(mondayOf(new Date()))}`;
    if (pathname === "/") router.replace(url, { scroll: false });
    else router.push(url);
  }

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <nav
      aria-label="주 메뉴"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch justify-around border-t border-border bg-secondary/95 backdrop-blur",
        "sm:sticky sm:top-0 sm:h-screen sm:w-[76px] sm:shrink-0 sm:flex-col sm:items-center sm:justify-start sm:gap-1 sm:border-t-0 sm:border-r sm:bg-secondary sm:py-3.5"
      )}
    >
      <div className="mb-3.5 hidden size-9 items-center justify-center rounded-[9px] bg-primary sm:flex" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <RailButton label="캘린더" active={!onPara} onClick={goCalendar}>
        <Calendar className="size-[22px]" strokeWidth={1.8} />
      </RailButton>
      <RailButton label="PARA" active={onPara} onClick={() => router.push("/para")}>
        <LayoutGrid className="size-[22px]" strokeWidth={1.8} />
      </RailButton>
      <RailButton label="Inbox" active={inboxOpen} onClick={toggleInbox} pressed={inboxOpen}>
        <Inbox className="size-[22px]" strokeWidth={1.8} />
        {backlogItems.length > 0 ? (
          <span className="absolute right-[calc(50%-22px)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-today px-1 text-[10px] font-bold text-white">
            {backlogItems.length > 99 ? "99+" : backlogItems.length}
          </span>
        ) : null}
      </RailButton>

      <div className="hidden flex-1 sm:block" />

      <button
        type="button"
        onClick={onToggleAccount}
        aria-label="계정 메뉴"
        aria-haspopup="menu"
        aria-expanded={accountOpen}
        data-account-toggle=""
        className="relative flex flex-1 flex-col items-center justify-center gap-1 sm:size-11 sm:flex-none"
      >
        <span
          className={cn(
            "flex size-[30px] items-center justify-center rounded-full bg-accent text-[11.5px] font-bold text-accent-foreground sm:size-[34px] sm:text-[12px]",
            accountOpen && "ring-[3px] ring-primary/35"
          )}
        >
          {initials}
        </span>
        {!googleConnected ? (
          <span
            className="absolute right-[calc(50%-18px)] top-1.5 size-2.5 rounded-full border-2 border-secondary bg-warning sm:right-1 sm:top-1"
            aria-label="Google Drive 연결 안 됨"
          />
        ) : null}
        <span className="text-[10.5px] font-semibold text-muted-foreground sm:hidden">계정</span>
      </button>
    </nav>
  );
}

function RailButton({
  label,
  active,
  pressed,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={pressed === undefined && active ? "page" : undefined}
      aria-pressed={pressed}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors",
        "sm:h-14 sm:w-[60px] sm:flex-none sm:rounded-[10px] sm:hover:bg-black/5",
        active && "text-primary sm:bg-primary/12 sm:hover:bg-primary/12"
      )}
    >
      {children}
      <span className="text-[10.5px] font-semibold">{label}</span>
    </button>
  );
}

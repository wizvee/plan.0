"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Cloud, LogOut, RefreshCw } from "lucide-react";

import { useSession } from "@/lib/app-data/app-data-provider";
import { useSignOut } from "@/lib/app-data/use-sign-out";

/**
 * 레일 하단 아바타(모바일은 "계정" 탭)로 여는 계정 메뉴 — 이메일 · Google Drive 연결/재연결 · 로그아웃.
 * Drive 연결 링크는 지금 보던 화면으로 돌아오도록 `next`를 붙인다(결과는 DriveStatusBanner).
 */
export function AccountMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userEmail, googleConnected } = useSession();
  const signOut = useSignOut();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (menuRef.current?.contains(target) || target?.closest("[data-account-toggle]")) return;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const googleAuthHref = `/api/auth/google?next=${encodeURIComponent(pathname)}`;
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="계정"
      className="fixed bottom-[calc(var(--tabbar-h)+8px)] right-2 z-[60] w-[280px] rounded-xl border border-black/10 bg-popover/95 p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur sm:bottom-3.5 sm:left-[84px] sm:right-auto"
    >
      <div className="flex items-center gap-2.5 px-2.5 pb-3 pt-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">
          {initials}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13.5px] font-semibold">내 계정</span>
          <span className="truncate text-[12px] text-muted-foreground">{userEmail}</span>
        </div>
      </div>
      <div className="mx-1.5 h-px bg-border" />

      <div className="px-2.5 pb-1.5 pt-2.5 text-[11px] font-semibold text-muted-foreground">Google Drive</div>
      <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-1">
        <Cloud
          className={googleConnected ? "size-[18px] text-category-area" : "size-[18px] text-warning"}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <div className="flex flex-1 flex-col">
          <span className="text-[13.5px]">{googleConnected ? "연결됨" : "연결 안 됨"}</span>
          <span className="text-[11.5px] text-muted-foreground">
            {googleConnected ? "PARA 자료 탭에서 사용 중" : "자료 탭을 쓰려면 연결하세요"}
          </span>
        </div>
        {googleConnected ? (
          <a
            href={googleAuthHref}
            role="menuitem"
            className="flex h-7 items-center gap-1.5 rounded-md bg-secondary px-2.5 text-[12.5px] font-medium hover:bg-black/10"
          >
            <RefreshCw className="size-[13px]" strokeWidth={1.8} />
            재연결
          </a>
        ) : (
          <a
            href={googleAuthHref}
            role="menuitem"
            className="flex h-7 items-center rounded-md bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground"
          >
            연결
          </a>
        )}
      </div>

      <div className="mx-1.5 my-0.5 h-px bg-border" />
      <button
        type="button"
        role="menuitem"
        onClick={() => void signOut()}
        className="mt-0.5 flex h-[34px] w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
      >
        <LogOut className="size-4" strokeWidth={1.8} />
        로그아웃
      </button>
    </div>
  );
}

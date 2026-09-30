"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { format, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowsClockwise, Bell, BellSlash, Cloud, SignOut, TreeStructure } from "@/components/icons";

import { useSession } from "@/lib/app-data/app-data-provider";
import { useSignOut } from "@/lib/app-data/use-sign-out";
import { useContexts } from "@/lib/app-data/use-contexts";
import { useShellUI } from "@/lib/shell-ui";
import { cn } from "@/lib/utils";
import {
  currentPushState,
  disablePush,
  enablePush,
  pushEnvironment,
  showTestNotification,
  type PushState,
} from "@/lib/push-client";

/**
 * 레일 하단 아바타(모바일은 "계정" 탭)로 여는 계정 메뉴 — 이메일 · 현재 컨텍스트 · 알림(이 기기) ·
 * Google Drive 연결/재연결 · 로그아웃.
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
      className="fixed bottom-[calc(var(--tabbar-h)+8px)] left-2 right-2 z-[60] max-h-[calc(100dvh-var(--tabbar-h)-24px)] overflow-y-auto rounded-xl border border-black/10 bg-popover/95 p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur sm:bottom-3.5 sm:left-[84px] sm:right-auto sm:w-[300px]"
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

      <ContextSection onOpenManager={onClose} />
      <div className="mx-1.5 my-0.5 h-px bg-border" />
      <NotificationSection />
      <div className="mx-1.5 my-0.5 h-px bg-border" />

      <div className="px-2.5 pb-1.5 pt-2.5 text-[11px] font-semibold text-muted-foreground">Google Drive</div>
      <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-1">
        <Cloud
          className={googleConnected ? "size-[18px] text-category-area" : "size-[18px] text-warning"}
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
            <ArrowsClockwise className="size-[13px]" />
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
        <SignOut className="size-4" />
        로그아웃
      </button>
    </div>
  );
}

/** 지금 컨텍스트(단축어 · 집중 모드가 바꿈) + 컨텍스트 관리 열기 */
function ContextSection({ onOpenManager }: { onOpenManager: () => void }) {
  const { contexts, currentContext, current } = useContexts();
  const { openContextManager } = useShellUI();

  const changedLabel = current.changedAt
    ? `단축어로 바뀜 · ${format(new Date(current.changedAt), isToday(new Date(current.changedAt)) ? "a h:mm" : "M월 d일 a h:mm", { locale: ko })}`
    : "단축어를 연결하면 집중 모드에 따라 바뀌어요";

  return (
    <>
      <div className="px-2.5 pb-1.5 pt-2.5 text-[11px] font-semibold text-muted-foreground">컨텍스트</div>
      <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-0.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13.5px] font-semibold">{currentContext ? `지금 ${currentContext.name}` : "지금 전체"}</span>
          <span className="text-[11.5px] text-muted-foreground">{changedLabel}</span>
        </div>
      </div>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onOpenManager();
          openContextManager();
        }}
        className="flex h-[34px] w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
      >
        <TreeStructure className="size-4" />
        <span className="flex-1">컨텍스트 관리…</span>
        <span className="text-[12px] opacity-70">{contexts.length}개</span>
      </button>
    </>
  );
}

/** 이 기기의 푸시 알림 켜기/끄기 · 테스트 + "컨텍스트 바뀔 때 알림" 설정 */
function NotificationSection() {
  const { userId } = useSession();
  const { current, setNotifyOnChange } = useContexts();
  const environment = pushEnvironment();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (environment !== "ready") return;
    let active = true;
    void currentPushState().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [environment]);

  async function run(action: () => Promise<PushState>) {
    setBusy(true);
    setError(null);
    try {
      setState(await action());
    } catch {
      setError("알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const on = state === "on";

  return (
    <>
      <div className="px-2.5 pb-1.5 pt-2.5 text-[11px] font-semibold text-muted-foreground">알림 · 이 기기</div>

      {environment === "ios-needs-install" ? (
        <div className="mx-1 mb-2 flex flex-col gap-1.5 rounded-lg bg-secondary px-3 py-2.5">
          <span className="text-[13px] font-semibold">홈 화면에 추가한 앱에서만 알림을 받을 수 있어요</span>
          <ol className="list-decimal pl-4 text-[12.5px] leading-relaxed text-foreground/80">
            <li>Safari 공유 버튼 → &quot;홈 화면에 추가&quot;</li>
            <li>홈 화면의 PLAN.0으로 열고 다시 로그인</li>
            <li>계정 → 알림 켜기</li>
          </ol>
        </div>
      ) : environment === "unsupported" || environment === "not-configured" ? (
        <p className="px-2.5 pb-2 text-[12.5px] text-muted-foreground">
          {environment === "unsupported" ? "이 브라우저는 알림을 지원하지 않아요." : "알림 서버 설정이 아직 없어요 (VAPID 키)."}
        </p>
      ) : (
        <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-0.5">
          {on ? (
            <Bell className="size-[18px] shrink-0 text-category-area" aria-hidden="true" />
          ) : (
            <BellSlash className="size-[18px] shrink-0 text-warning" aria-hidden="true" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13.5px]">{state === null ? "확인 중…" : on ? "켜짐" : state === "denied" ? "차단됨" : "꺼짐"}</span>
            <span className="text-[11.5px] text-muted-foreground">
              {state === "denied" ? "설정 앱에서 알림을 허용해 주세요" : "시작 10분 전 알림 · 배지 = 안 한 일"}
            </span>
          </div>
          {on ? (
            <>
              <button
                type="button"
                onClick={() => void showTestNotification()}
                className="flex h-7 items-center rounded-md bg-secondary px-2.5 text-[12.5px] font-medium hover:bg-black/10"
              >
                테스트
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(disablePush)}
                className="flex h-7 items-center rounded-md px-2 text-[12.5px] font-medium text-muted-foreground hover:bg-black/5"
              >
                끄기
              </button>
            </>
          ) : state === "off" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => enablePush(userId))}
              className="flex h-9 items-center rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60 sm:h-7 sm:rounded-md sm:text-[12.5px]"
            >
              알림 켜기
            </button>
          ) : null}
        </div>
      )}
      {error ? <p className="px-2.5 pb-2 text-[12px] text-destructive">{error}</p> : null}

      <button
        type="button"
        role="switch"
        aria-checked={current.notifyOnChange}
        onClick={() => void setNotifyOnChange(!current.notifyOnChange)}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 pb-2 pt-1 text-left hover:bg-black/[0.03]"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13.5px]">컨텍스트 바뀔 때 알림</span>
          <span className="text-[11.5px] text-muted-foreground">&quot;회사 · 안 한 일 3개&quot; — 배지를 바로 맞춤</span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
            current.notifyOnChange ? "bg-category-area" : "bg-black/15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]",
              current.notifyOnChange ? "left-[18px]" : "left-0.5"
            )}
          />
        </span>
      </button>
    </>
  );
}

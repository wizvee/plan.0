"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, DotsThree, Moon, X } from "@/components/icons";

import { cn } from "@/lib/utils";
import { CONTEXT_COLORS, CONTEXT_COLOR_LABEL, contextColor } from "@/lib/context-color";
import type { Context } from "@/lib/types";
import { useDismiss } from "@/lib/use-dismiss";
import { useShellUI } from "@/lib/shell-ui";
import { useContexts } from "@/lib/app-data/use-contexts";

/**
 * 컨텍스트 관리 팝업 — 목록(이름 · 단축어 키 · PARA 개수) · 추가 · 이름 바꾸기 · 기본 지정 · 삭제 + 단축어에 넣을 값 안내.
 * 셸이 한 번만 렌더링하고, 화면 · 계정 메뉴는 `useShellUI().openContextManager()`로 연다. (WEBAPP-PLAN.md 4단계)
 */
export function ContextManager() {
  const { contextManager, closeContextManager } = useShellUI();
  const { contexts, currentContext, containerCountOf, addContext } = useContexts();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!contextManager.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeContextManager();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [contextManager.open, closeContextManager]);

  useEffect(() => {
    if (contextManager.open && contextManager.focusAdd) nameRef.current?.focus();
  }, [contextManager]);

  if (!contextManager.open) return null;

  async function submit() {
    const failure = await addContext(name, key);
    setError(failure);
    if (!failure) {
      setName("");
      setKey("");
    }
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={closeContextManager}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="컨텍스트 관리"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[480px] flex-col gap-3.5 overflow-y-auto rounded-xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center">
          <h2 className="flex-1 text-[19px] font-bold">컨텍스트</h2>
          <button
            type="button"
            onClick={closeContextManager}
            aria-label="닫기"
            className="flex size-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground hover:bg-black/10"
          >
            <X weight="bold" className="size-3.5" />
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          PARA마다 컨텍스트를 고르면, 지금 컨텍스트에 속한 할 일만 배지와 알림에 뜹니다. 고르지 않은 PARA와 PARA 없는 할 일은{" "}
          <b className="font-semibold text-foreground">기본</b> 컨텍스트예요. 색과 수면 표시는 목표 화면의 시간 균형에 쓰여요.
        </p>

        <div className="overflow-visible rounded-xl border border-border">
          {contexts.map((context) => (
            <ContextRow
              key={context.id}
              context={context}
              count={containerCountOf(context)}
              isCurrent={currentContext?.id === context.id}
            />
          ))}
          <form
            className="flex flex-wrap items-end gap-2 bg-panel p-2.5 pl-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="flex min-w-[140px] flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">이름</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 공부"
                className="h-8 rounded-[7px] border border-black/[0.12] bg-card px-2.5 text-[14px] outline-none focus:border-primary"
              />
            </label>
            <label className="flex w-[130px] flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">단축어 키 (영문)</span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                placeholder="study"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-8 rounded-[7px] border border-black/[0.12] bg-card px-2.5 font-mono text-[13px] outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              className="h-8 rounded-[7px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
              disabled={!name.trim() || !key.trim()}
            >
              추가
            </button>
            {error ? <p className="w-full text-[12px] text-destructive">{error}</p> : null}
          </form>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-secondary px-3.5 py-3">
          <span className="text-[13px] font-bold">단축어 자동화에 넣을 값</span>
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-y-1.5 text-[12.5px]">
            <span className="text-muted-foreground">주소</span>
            <code className="break-all font-mono text-[12px]">POST {origin}/api/context</code>
            <span className="text-muted-foreground">집중 모드 켜질 때</span>
            <code className="font-mono text-[12px]">{`{"context": "<키>"}`}</code>
            <span className="text-muted-foreground">꺼질 때</span>
            <span>
              <code className="font-mono text-[12px]">{`{"context": "all"}`}</code>
              <span className="text-muted-foreground"> → 전부</span>
            </span>
          </div>
          <span className="text-[12px] text-muted-foreground">비밀 키 헤더와 단축어 만드는 법은 README의 &quot;컨텍스트 단축어&quot; 참고</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ContextRow({ context, count, isCurrent }: { context: Context; count: number; isCurrent: boolean }) {
  const { renameContext, setDefaultContext, setContextColor, setSleepContext, removeContext } = useContexts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(context.name);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuOpen, menuRef, () => setMenuOpen(false));

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(context.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // 클립보드 권한 없음 — 키는 화면에 보이므로 무시
    }
  }

  const detail = [context.isDefault ? "나머지 전부" : `PARA ${count}개`, isCurrent ? "지금 이 컨텍스트" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-[52px] items-center gap-2 border-b border-border pl-2 pr-2.5">
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label={`${context.name} 색 바꾸기 — 지금 ${CONTEXT_COLOR_LABEL[context.color]}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
      >
        <span className="size-3 rounded-full" style={{ backgroundColor: contextColor(context.color) }} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-1.5">
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              if (draft.trim() && draft.trim() !== context.name) void renameContext(context.id, draft);
              else setDraft(context.name);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
            }}
            aria-label="컨텍스트 이름"
            className="h-7 rounded-md border border-primary bg-card px-1.5 text-[14px] font-semibold outline-none"
          />
        ) : (
          <span className="flex items-center gap-1.5 text-[14px] font-semibold">
            {context.name}
            {context.isDefault ? (
              <span className="rounded-[5px] bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-foreground">기본</span>
            ) : null}
            {context.isSleep ? (
              <span
                className="flex items-center gap-[3px] rounded-[5px] px-1.5 py-px text-[11px] font-semibold"
                style={{ backgroundColor: "var(--ctx-indigo-tint)", color: "var(--ctx-indigo)" }}
              >
                <Moon weight="bold" className="size-[11px]" aria-hidden="true" />
                수면으로 세기
              </span>
            ) : null}
          </span>
        )}
        <span className="text-[12px] text-muted-foreground">{detail}</span>
      </div>
      <code className="rounded-[5px] bg-black/[0.06] px-[7px] py-0.5 font-mono text-[12px]">{context.key}</code>
      <button
        type="button"
        onClick={() => void copyKey()}
        aria-label={`${context.key} 복사`}
        className="flex size-7 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-black/5"
      >
        {copied ? <Check weight="bold" className="size-3.5 text-category-area" /> : <Copy className="size-3.5" />}
      </button>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="더 보기"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex size-7 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-black/5"
        >
          <DotsThree className="size-4" />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-10 w-[236px] rounded-[10px] border border-black/10 bg-popover/95 p-[5px] shadow-[0_12px_32px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur"
          >
            <span className="block px-2 pb-1 pt-1.5 text-[11.5px] font-semibold text-muted-foreground">색</span>
            <div className="grid grid-cols-8 gap-1 px-1.5 pb-2">
              {CONTEXT_COLORS.map((color) => {
                const selected = context.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      if (!selected) void setContextColor(context.id, color);
                    }}
                    aria-label={CONTEXT_COLOR_LABEL[color]}
                    aria-pressed={selected}
                    className="size-[22px] rounded-full"
                    style={{
                      backgroundColor: contextColor(color),
                      // 고른 색 — 흰 틈 + 같은 색 링 (시안 ⑤)
                      boxShadow: selected ? `0 0 0 2px var(--popover), 0 0 0 4px ${contextColor(color)}` : undefined,
                    }}
                  />
                );
              })}
            </div>
            <div className="mx-1.5 mb-[5px] h-px bg-border" />
            {!context.isDefault ? (
              // 기본(기타)은 매핑 없는 할 일까지 받으므로 수면이 될 수 없다
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={context.isSleep}
                onClick={() => {
                  setMenuOpen(false);
                  void setSleepContext(context.id, !context.isSleep);
                }}
                className="group flex w-full items-start gap-2 rounded-md px-2 py-[7px] text-left hover:bg-primary hover:text-primary-foreground"
              >
                <span className="flex w-[13px] shrink-0 justify-center pt-[3px]">
                  {context.isSleep ? <Check weight="bold" className="size-[13px]" /> : null}
                </span>
                <span className="flex flex-col gap-px">
                  <span className="text-[13.5px]">수면으로 세기</span>
                  <span className="text-[11.5px] text-muted-foreground group-hover:text-primary-foreground/85">
                    깨어 있는 시간에서 빼요 · 하나만
                  </span>
                </span>
              </button>
            ) : null}
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                setRenaming(true);
              }}
            >
              이름 바꾸기
            </MenuItem>
            {!context.isDefault ? (
              <>
                {context.isSleep ? null : (
                  // 수면은 기본이 될 수 없다 — 매핑 없는 할 일이 전부 수면으로 세지게 된다
                  <MenuItem
                    onClick={() => {
                      setMenuOpen(false);
                      void setDefaultContext(context.id);
                    }}
                  >
                    기본으로 지정
                  </MenuItem>
                )}
                <MenuItem
                  destructive
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`"${context.name}" 컨텍스트를 지울까요? 이 컨텍스트의 PARA는 기본으로 돌아가요.`)) {
                      void removeContext(context.id);
                    }
                  }}
                >
                  삭제
                </MenuItem>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuItem({ onClick, destructive, children }: { onClick: () => void; destructive?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center rounded-md py-0 pl-[29px] pr-2 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground",
        destructive && "text-destructive"
      )}
    >
      {children}
    </button>
  );
}

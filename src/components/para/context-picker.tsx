"use client";

import { useRef, useState } from "react";
import { CaretUpDown, Check, Plus } from "@/components/icons";

import { useDismiss } from "@/lib/use-dismiss";
import { useShellUI } from "@/lib/shell-ui";
import { useContexts } from "@/lib/app-data/use-contexts";
import { contextColor } from "@/lib/context-color";

/**
 * PARA 상세 Overview의 "컨텍스트" 선택 — 회사 / 개인 / … 중 하나. 기본 컨텍스트를 고르면 null로 저장한다
 * (null = 기본이라, 나중에 기본을 바꿔도 따라감). "새 컨텍스트… / 컨텍스트 관리…"는 셸의 관리 팝업을 연다.
 */
export function ContextPicker({ contextId, onChange }: { contextId: string | null; onChange: (contextId: string | null) => void }) {
  const { contexts, contextOfContainer } = useContexts();
  const { openContextManager } = useShellUI();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  const selected = contextOfContainer(contextId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-[30px] items-center gap-1.5 rounded-[7px] bg-black/[0.06] pl-2.5 pr-2 text-[13.5px] font-semibold hover:bg-black/10"
      >
        {selected ? (
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: contextColor(selected.color) }} />
        ) : null}
        {selected?.name ?? "—"}
        <CaretUpDown weight="bold" className="size-3 text-muted-foreground" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="컨텍스트 선택"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[232px] rounded-xl border border-black/10 bg-popover/95 p-[5px] shadow-[0_14px_36px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur"
        >
          {contexts.map((context) => {
            const checked = selected?.id === context.id;
            return (
              <button
                key={context.id}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => {
                  onChange(context.isDefault ? null : context.id);
                  setOpen(false);
                }}
                className="group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
              >
                <span className="flex w-[13px] justify-center">
                  {checked ? <Check weight="bold" className="size-[13px]" /> : null}
                </span>
                <span
                  className="size-2 shrink-0 rounded-full group-hover:shadow-[0_0_0_1.5px_white]"
                  style={{ backgroundColor: contextColor(context.color) }}
                />
                <span className="flex-1">
                  {context.name}
                  {context.isDefault ? (
                    <span className="text-[12px] text-muted-foreground group-hover:text-primary-foreground/80"> · 기본</span>
                  ) : null}
                </span>
                <span className="font-mono text-[11.5px] text-muted-foreground group-hover:text-primary-foreground/80">
                  {context.key}
                </span>
              </button>
            );
          })}
          <div className="mx-1.5 my-[5px] h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openContextManager({ focusAdd: true });
            }}
            className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
          >
            <Plus weight="bold" className="size-[13px]" />
            새 컨텍스트…
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openContextManager();
            }}
            className="flex h-8 w-full items-center gap-2 rounded-md py-0 pl-[29px] pr-2 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
          >
            컨텍스트 관리…
          </button>
        </div>
      ) : null}
    </div>
  );
}

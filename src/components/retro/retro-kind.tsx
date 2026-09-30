"use client";

import { useRef, useState } from "react";
import { CaretDown, Check } from "@/components/icons";

import { cn } from "@/lib/utils";
import { useDismiss } from "@/lib/use-dismiss";
import { MARK_META } from "@/components/memo/mark-meta";
import { MarkIcon } from "@/components/memo/memo-view";
import { RETRO_KINDS, RETRO_STATE, type RetroKind } from "@/lib/retro";

/** 회고 종류 아이콘 — 메모 줄 표시와 같은 둥근 사각형 칸. 크기는 `className`(기본 18px). */
export function RetroKindIcon({ kind, className }: { kind: RetroKind; className?: string }) {
  return <MarkIcon state={RETRO_STATE[kind]} className={className} />;
}

/**
 * 회고 종류 드롭다운 — 버튼(아이콘 + 라벨 + ⌄)을 누르면 macOS 메뉴 스타일 목록.
 * `placement="up"`은 목록이 위로 열린다(아래 공간이 없을 때).
 */
export function RetroKindSelect({
  value,
  onChange,
  placement = "down",
}: {
  value: RetroKind;
  onChange: (kind: RetroKind) => void;
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`회고 종류: ${MARK_META[value].label}`}
        className="flex h-[30px] items-center gap-1.5 rounded-[7px] bg-black/[0.05] pl-[5px] pr-1.5 text-[13px] font-semibold hover:bg-black/[0.09]"
      >
        <RetroKindIcon kind={value} className="mt-0 size-5" />
        {MARK_META[value].label}
        <CaretDown weight="bold" className="size-3 text-muted-foreground" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="회고 종류"
          className={cn(
            "absolute left-0 z-30 w-[168px] rounded-[10px] border border-black/10 bg-popover/95 p-[5px] shadow-[0_12px_32px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur",
            placement === "up" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
          )}
        >
          {RETRO_KINDS.map((kind) => {
            const Icon = MARK_META[kind].icon;
            const checked = kind === value;
            return (
              <button
                key={kind}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => {
                  onChange(kind);
                  setOpen(false);
                }}
                className="group flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
              >
                <span className="flex w-[13px] justify-center text-primary group-hover:text-primary-foreground">
                  {checked ? <Check weight="bold" className="size-[13px]" /> : null}
                </span>
                <Icon
                  weight="bold"
                  className="size-[15px] group-hover:text-primary-foreground!"
                  style={{ color: MARK_META[kind].color }}
                  aria-hidden="true"
                />
                {MARK_META[kind].label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

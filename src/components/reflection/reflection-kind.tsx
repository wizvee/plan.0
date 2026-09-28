"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDismiss } from "@/lib/use-dismiss";
import { REFLECTION_COLOR_VAR, REFLECTION_META, REFLECTION_TINT_VAR } from "@/lib/reflection";
import { REFLECTION_KINDS, type ReflectionKind } from "@/lib/types";

/** 회고 종류 아이콘 — 종류 색 틴트 원 안에 아이콘. `size`는 원 지름(px). */
export function ReflectionKindIcon({ kind, size = 22, className }: { kind: ReflectionKind; size?: number; className?: string }) {
  const Icon = REFLECTION_META[kind].icon;
  return (
    <span
      role="img"
      aria-label={REFLECTION_META[kind].label}
      className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `var(${REFLECTION_TINT_VAR[kind]})`,
        color: `var(${REFLECTION_COLOR_VAR[kind]})`,
      }}
    >
      <Icon style={{ width: size * 0.58, height: size * 0.58 }} strokeWidth={1.9} aria-hidden="true" />
    </span>
  );
}

/**
 * 회고 종류 드롭다운 — 버튼(아이콘 + 라벨 + ⌄)을 누르면 macOS 메뉴 스타일 목록.
 * `placement="up"`은 목록이 위로 열린다(할 일 상세 모달의 맨 아래 입력 줄처럼 아래 공간이 없을 때).
 */
export function ReflectionKindSelect({
  value,
  onChange,
  placement = "down",
}: {
  value: ReflectionKind;
  onChange: (kind: ReflectionKind) => void;
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
        aria-label={`회고 종류: ${REFLECTION_META[value].label}`}
        className="flex h-[30px] items-center gap-1.5 rounded-[7px] bg-black/[0.05] pl-[5px] pr-1.5 text-[13px] font-semibold hover:bg-black/[0.09]"
      >
        <ReflectionKindIcon kind={value} size={20} />
        {REFLECTION_META[value].label}
        <ChevronDown className="size-3 text-muted-foreground" strokeWidth={2.2} aria-hidden="true" />
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
          {REFLECTION_KINDS.map((kind) => {
            const Icon = REFLECTION_META[kind].icon;
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
                  {checked ? <Check className="size-[13px]" strokeWidth={2.6} /> : null}
                </span>
                <Icon
                  className="size-[15px] group-hover:text-primary-foreground!"
                  style={{ color: `var(${REFLECTION_COLOR_VAR[kind]})` }}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                {REFLECTION_META[kind].label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import type { Ref } from "react";

import { cn } from "@/lib/utils";
import { MARK_KINDS, type MarkKind } from "@/lib/memo-marks";
import { MARK_META } from "@/components/memo/mark-meta";

/**
 * 메모 편집 칸 위 줄 표시 버튼 5개 — `확인 · 질문 · 잘한 점 · 아쉬운 점 · 다음엔` (MEMO-MARKS-PLAN.md 3번).
 * 누르는 동안 입력칸 포커스를 뺏지 않는다(mousedown 기본 동작 막기). 실제 글자 고치기는 `MemoEditor`가 한다.
 * `activeKind` = 커서가 있는 줄(들)의 종류 — 그 버튼이 눌린 모양.
 */
export function MemoToolbar({
  ref,
  activeKind,
  onApply,
  onPressStart,
  onPressCancel,
}: {
  ref?: Ref<HTMLDivElement>;
  activeKind: MarkKind | null;
  onApply: (kind: MarkKind) => void;
  onPressStart: () => void;
  onPressCancel: () => void;
}) {
  return (
    <div ref={ref} role="toolbar" aria-label="줄 표시" className="flex shrink-0 flex-wrap gap-1">
      {MARK_KINDS.map((kind) => {
        const meta = MARK_META[kind];
        const Icon = meta.icon;
        const pressed = activeKind === kind;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={pressed}
            onPointerDown={onPressStart}
            onPointerCancel={onPressCancel}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onApply(kind)}
            className={cn(
              "flex h-7 items-center gap-1 rounded-[7px] border-[1.5px] pl-1.5 pr-2 text-[12.5px] font-semibold",
              !pressed && "border-transparent bg-black/[0.05] text-foreground hover:bg-black/[0.09]"
            )}
            style={pressed ? { borderColor: meta.color, backgroundColor: meta.tint, color: meta.color } : undefined}
          >
            <Icon weight="bold" className="size-3.5 shrink-0" style={{ color: meta.color }} aria-hidden="true" />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

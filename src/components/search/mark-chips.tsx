"use client";

import { cn } from "@/lib/utils";
import { MARK_META } from "@/components/memo/mark-meta";
import { search, type SearchIndex } from "@/lib/search";
import type { MarkState } from "@/lib/memo-marks";

/**
 * 메모 줄 표시 모아보기 칩 `확인할 것` · `질문` + "끝난 것도 보기" 스위치 (MEMO-MARKS-PLAN.md 5번).
 * 검색 패널과 PARA 개요의 "남은 것" 카드가 같이 쓴다.
 */
export type MarkChip = "check" | "question";

export const MARK_CHIPS: Record<MarkChip, { open: MarkState; done: MarkState; label: string }> = {
  check: { open: " ", done: "x", label: "확인할 것" },
  question: { open: "?", done: "i", label: "질문" },
};

/** 칩이 고르는 줄 표시 — 끝난 것도 보기면 `[x]` · `[i]`까지 */
export function chipMarks(chip: MarkChip | null, showDone: boolean): MarkState[] {
  if (!chip) return [];
  return showDone ? [MARK_CHIPS[chip].open, MARK_CHIPS[chip].done] : [MARK_CHIPS[chip].open];
}

/** 칩 개수 — 열린 줄(확인할 것 = `[ ]`, 질문 = `[?]`). `done`은 끝난 줄(`[x]` · `[i]`) 수 */
export function countMarks(index: SearchIndex): Record<MarkChip, number> & { done: number } {
  const count = (marks: MarkState[]) => {
    const r = search(index, "", { marks });
    return r.mode === "lines" ? r.lines.length : 0;
  };
  return { check: count([" "]), question: count(["?"]), done: count(["x", "i"]) };
}

export function MarkChipButtons({
  chip,
  counts,
  onChange,
  allowNone = true,
}: {
  chip: MarkChip | null;
  counts: Record<MarkChip, number>;
  onChange: (chip: MarkChip | null) => void;
  /** 켜진 칩을 다시 누르면 끄기 (검색 패널). PARA 카드는 늘 하나가 켜져 있다 */
  allowNone?: boolean;
}) {
  return (
    <>
      {(Object.keys(MARK_CHIPS) as MarkChip[]).map((key) => {
        const pressed = chip === key;
        const Icon = MARK_META[key].icon;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(pressed && allowNone ? null : key)}
            className={cn(
              "flex h-7 shrink-0 items-center gap-[5px] rounded-[7px] pl-2 pr-2.5 text-[13px] font-semibold",
              pressed ? "bg-primary text-primary-foreground" : "bg-black/[0.06] text-foreground hover:bg-black/[0.09]"
            )}
          >
            <Icon weight="bold" className="size-3.5" aria-hidden="true" />
            {MARK_CHIPS[key].label}
            <span className="font-medium tabular-nums opacity-75">{counts[key]}</span>
          </button>
        );
      })}
    </>
  );
}

export function ShowDoneSwitch({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex shrink-0 cursor-pointer items-center gap-[7px] text-[12.5px] text-muted-foreground", className)}>
      끝난 것도 보기
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-[18px] w-[30px] rounded-full bg-black/[0.12] transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-3.5 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.25)] after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-3 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
      />
    </label>
  );
}

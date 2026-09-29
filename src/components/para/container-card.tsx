"use client";

import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";

import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, CATEGORY_TINT_VAR } from "@/lib/category";
import type { ParaKind } from "@/lib/types";
import type { DropTargetData } from "@/lib/dnd/drop-targets";

interface ContainerCardProps {
  kind: ParaKind;
  id: string;
  name: string;
  statusLabel: string;
  statusDone: boolean;
  count: number;
  /** Project 전용 — 매핑된 할 일의 완료 비율 */
  progress?: number;
  onClick: () => void;
  /** 기본이 아닌 컨텍스트 이름(회사 · 공부 …) — 있으면 이름 옆에 작은 칩 */
  contextName?: string;
  /** Project 전용 — 시작일 ~ 종료일(yyyy-MM-dd). 종료일이 없으면 null(공란) */
  period?: { start: string; end: string | null };
}

export function ContainerCard({ kind, id, name, statusLabel, statusDone, count, progress, onClick, contextName, period }: ContainerCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `para:${kind}:${id}`,
    data: { type: "para-container", kind, id } satisfies DropTargetData,
  });

  const colorVar = `var(${CATEGORY_COLOR_VAR[kind]})`;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className={cn(
        "relative flex cursor-pointer flex-col gap-3 rounded-[4px] border border-border bg-card pb-3.5 pl-5 pr-4 pt-3.5 transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]",
        statusDone && "opacity-60",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* 캘린더 블록의 CategoryBar와 같은 모양 — 모서리를 따라 휘지 않도록 안쪽으로 3px 띄운 세로 막대 */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-[3px] left-[3px] top-[3px] w-[3px] rounded-[2px]",
          statusDone && "bg-black/[0.15]"
        )}
        style={statusDone ? undefined : { backgroundColor: colorVar }}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[15.5px] font-semibold tracking-[-0.2px]">
            <InlineText text={name} />
          </span>
          {contextName ? (
            <span className="shrink-0 rounded-[5px] bg-black/[0.06] px-[7px] py-0.5 text-[11.5px] font-semibold text-foreground/80">
              {contextName}
            </span>
          ) : null}
        </div>
        {period ? (
          <span className="text-[12.5px] tabular-nums text-muted-foreground">
            {formatPeriodDate(period.start)} – {period.end ? formatPeriodDate(period.end) : ""}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span
          className={cn(
            "rounded-[5px] px-[7px] py-0.5 font-semibold",
            statusDone ? "bg-black/[0.06] text-muted-foreground" : "text-foreground"
          )}
          style={statusDone ? undefined : { backgroundColor: `var(${CATEGORY_TINT_VAR[kind]})` }}
        >
          {statusLabel}
        </span>
        <span className="whitespace-nowrap">항목 {count}개</span>
      </div>
      {progress !== undefined ? (
        <div className="flex items-center gap-2">
          <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-black/[0.07]">
            <span className="block h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: colorVar }} />
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-foreground/75">{progress}%</span>
        </div>
      ) : null}
    </div>
  );
}

/** 올해면 "9월 1일", 다른 해면 "2025년 9월 1일" */
function formatPeriodDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return format(date, date.getFullYear() === new Date().getFullYear() ? "M월 d일" : "yyyy년 M월 d일");
}

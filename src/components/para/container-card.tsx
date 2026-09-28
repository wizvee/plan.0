"use client";

import { useDroppable } from "@dnd-kit/core";

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
}

export function ContainerCard({ kind, id, name, statusLabel, statusDone, count, progress, onClick }: ContainerCardProps) {
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
      style={{ borderTopColor: statusDone ? undefined : colorVar }}
      className={cn(
        "flex cursor-pointer flex-col gap-3 rounded-xl border border-t-[3px] border-border bg-card px-4 pb-3.5 pt-4 transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]",
        statusDone && "opacity-60",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <span className="min-w-0 truncate text-[15.5px] font-semibold tracking-[-0.2px]">{name}</span>
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

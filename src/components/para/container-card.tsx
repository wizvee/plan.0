"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import type { ParaKind } from "@/lib/types";

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
  const { setNodeRef, isOver } = useDroppable({ id: `para:${kind}:${id}` });

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
        "cursor-pointer rounded-2xl border border-border bg-card px-4 py-3.5 transition-shadow hover:shadow-md",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{name}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11.5px] font-bold",
            statusDone ? "bg-secondary text-muted-foreground" : "bg-accent text-accent-foreground"
          )}
        >
          {statusLabel}
        </span>
        <span className="whitespace-nowrap">항목 {count}개</span>
        {progress !== undefined ? (
          <>
            <span className="h-[5px] max-w-[100px] flex-1 overflow-hidden rounded-full bg-secondary">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </span>
            <span className="tabular-nums">{progress}%</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

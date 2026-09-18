"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { Checkbox } from "@/components/ui/checkbox";
import { TodoDetailModal } from "@/components/todo-detail-modal";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, CATEGORY_TINT_VAR, getParaCategory } from "@/lib/category";
import {
  BLOCK_GAP,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_START_MINUTES,
  HOUR_HEIGHT,
  MIN_BLOCK_HEIGHT,
  MIN_DURATION_MINUTES,
  clampMinutes,
  minutesRangeLabel,
  minutesToPx,
  snapMinutes,
} from "@/lib/time";
import type { Area, Project, Resource, Todo } from "@/lib/types";

interface CalendarBlockProps {
  todo: Todo;
  projects?: Project[];
  areas?: Area[];
  resources?: Resource[];
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onMemoEdit?: (id: string, memo: string) => void;
  onUrlEdit?: (id: string, url: string | null) => void;
  onAssignPara?: (id: string, patch: { projectId: string | null; areaId: string | null; resourceId: string | null }) => void;
  onResize?: (id: string, durationMinutes: number) => void;
  overlay?: boolean;
}

export function CalendarBlock({
  todo,
  projects,
  areas,
  resources,
  onToggle,
  onRemove,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
  onResize,
  overlay,
}: CalendarBlockProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const resizeState = useRef<{ startY: number; startDuration: number } | null>(null);

  const startMinutes = todo.startMinutes ?? DEFAULT_START_MINUTES;
  const baseDuration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const duration = previewDuration ?? baseDuration;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: overlay,
  });

  function handleResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeState.current = { startY: e.clientY, startDuration: baseDuration };
  }

  function handleResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizeState.current) return;
    const deltaMinutes = ((e.clientY - resizeState.current.startY) / HOUR_HEIGHT) * 60;
    const next = clampMinutes(
      snapMinutes(resizeState.current.startDuration + deltaMinutes),
      MIN_DURATION_MINUTES,
      1440 - startMinutes
    );
    setPreviewDuration(next);
  }

  function handleResizePointerUp() {
    if (!resizeState.current) return;
    resizeState.current = null;
    if (previewDuration !== null) onResize?.(todo.id, previewDuration);
    setPreviewDuration(null);
  }

  const renderedHeight = Math.max(minutesToPx(duration), MIN_BLOCK_HEIGHT) - BLOCK_GAP;
  const compact = renderedHeight <= 34;

  const category = getParaCategory(todo);
  const colorVar = todo.completed
    ? "var(--muted-foreground)"
    : category
      ? `var(${CATEGORY_COLOR_VAR[category]})`
      : "var(--muted-foreground)";
  const tintVar = todo.completed
    ? "var(--muted)"
    : category
      ? `var(${CATEGORY_TINT_VAR[category]})`
      : "var(--secondary)";

  if (overlay) {
    return (
      <div
        className="w-[200px] rounded-[5px] border-l-[3px] px-2.5 py-1.5 shadow-lg"
        style={{ height: renderedHeight, borderLeftColor: colorVar, backgroundColor: tintVar }}
      >
        <p className="truncate text-[13px] font-medium text-foreground">{todo.content}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {minutesRangeLabel(startMinutes, duration)}
        </p>
      </div>
    );
  }

  const style: CSSProperties = {
    position: "absolute",
    top: minutesToPx(startMinutes),
    height: renderedHeight,
    left: 3,
    right: 3,
    transform: CSS.Translate.toString(transform),
    borderLeftColor: colorVar,
    backgroundColor: tintVar,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "absolute z-[1] flex touch-none select-none flex-col justify-center overflow-hidden rounded-[5px] border-l-[3px] px-2 py-1 shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md",
          isDragging && "z-20 opacity-40",
          compact && "flex-row items-center gap-1.5 py-0"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span onPointerDown={(e) => e.stopPropagation()} className="shrink-0">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => onToggle?.(todo.id)}
              className="size-4 border-primary/50 data-[state=checked]:bg-primary"
              aria-label="완료 표시"
            />
          </span>
          <span
            onClick={() => onEdit && setDetailOpen(true)}
            className={cn(
              "min-w-0 flex-1 cursor-pointer truncate text-[12.5px] font-medium leading-tight text-foreground",
              todo.completed && "text-muted-foreground line-through"
            )}
          >
            {todo.content}
          </span>
        </div>
        {!compact ? (
          <span className="truncate text-[10.5px] leading-tight text-muted-foreground">
            {minutesRangeLabel(startMinutes, duration)}
          </span>
        ) : null}
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
        />
      </div>
      {detailOpen ? (
        <TodoDetailModal
          todo={todo}
          projects={projects ?? []}
          areas={areas ?? []}
          resources={resources ?? []}
          onEdit={(id, content) => onEdit?.(id, content)}
          onMemoEdit={(id, memo) => onMemoEdit?.(id, memo)}
          onUrlEdit={(id, url) => onUrlEdit?.(id, url)}
          onAssignPara={(id, patch) => onAssignPara?.(id, patch)}
          onRemove={(id) => onRemove?.(id)}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}

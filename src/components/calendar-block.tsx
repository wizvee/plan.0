"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
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
import type { Todo } from "@/lib/types";

interface CalendarBlockProps {
  todo: Todo;
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onResize?: (id: string, durationMinutes: number) => void;
  overlay?: boolean;
}

export function CalendarBlock({ todo, onToggle, onRemove, onEdit, onResize, overlay }: CalendarBlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.content);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const resizeState = useRef<{ startY: number; startDuration: number } | null>(null);

  const startMinutes = todo.startMinutes ?? DEFAULT_START_MINUTES;
  const baseDuration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const duration = previewDuration ?? baseDuration;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: overlay,
  });

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== todo.content) {
      onEdit?.(todo.id, trimmed);
    } else {
      setDraft(todo.content);
    }
    setEditing(false);
  }

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

  const renderedHeight = Math.max(minutesToPx(duration), MIN_BLOCK_HEIGHT);
  const compact = renderedHeight <= 34;

  if (overlay) {
    return (
      <div
        className="w-[200px] rounded-[10px] border-l-[3px] border-primary bg-accent px-2.5 py-1.5 shadow-lg"
        style={{ height: renderedHeight }}
      >
        <p className="truncate text-[13px] font-medium text-accent-foreground">{todo.content}</p>
        <p className="truncate text-[11px] text-accent-foreground/70">
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group absolute z-[1] flex touch-none select-none flex-col justify-center overflow-hidden rounded-[9px] border-l-[3px] border-primary bg-accent px-2 py-1 shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md",
        isDragging && "z-20 opacity-40",
        todo.completed && "border-muted-foreground/60 bg-muted",
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
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") {
                setDraft(todo.content);
                setEditing(false);
              }
            }}
            className="h-5 flex-1 border-0 bg-transparent px-0 text-[12.5px] shadow-none focus-visible:ring-0"
          />
        ) : (
          <span
            onClick={() => onEdit && setEditing(true)}
            className={cn(
              "min-w-0 flex-1 cursor-text truncate text-[12.5px] font-medium leading-tight text-accent-foreground",
              todo.completed && "text-muted-foreground line-through"
            )}
          >
            {todo.content}
          </span>
        )}
        {onRemove ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(todo.id)}
            aria-label="삭제"
            className="shrink-0 text-accent-foreground/50 opacity-0 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="size-3" />
          </button>
        ) : null}
      </div>
      {!compact ? (
        <span className="truncate text-[10.5px] leading-tight text-accent-foreground/70">
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
  );
}

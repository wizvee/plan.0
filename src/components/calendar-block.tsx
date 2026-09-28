"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { Checkbox } from "@/components/ui/checkbox";
import { TodoDetailModal } from "@/components/todo-detail-modal";
import { InlineText } from "@/components/inline-text";
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
import type { DraggedTodoData } from "@/lib/dnd/drop-targets";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useSubtaskActions } from "@/lib/app-data/subtask-actions";

/** 블록 안 하위 할 일 목록 배치 — 머리(패딩 · 제목 · 시간) 아래, 진행률 바 위에 들어갈 줄 수를 계산할 때 쓴다. */
const SUBTASK_HEAD_PX = 40;
const SUBTASK_FOOT_PX = 9;
const SUBTASK_ROW_PX = 15;
/** 진행률 바를 그릴 최소 블록 높이 (그보다 짧으면 제목 옆 개수만) */
const PROGRESS_BAR_MIN_HEIGHT = 44;

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
  const { subtasksOf } = useSubtasks();
  const subtaskActions = useSubtaskActions();

  const startMinutes = todo.startMinutes ?? DEFAULT_START_MINUTES;
  const baseDuration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const duration = previewDuration ?? baseDuration;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: overlay,
    data: { type: "todo", source: "calendar" } satisfies DraggedTodoData,
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
  // 완료돼도 카테고리 색은 유지하고 블록 전체를 흐리게(애플 캘린더 방식). 매핑 없으면 회색.
  const colorVar = category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)";
  const tintVar = category ? `var(${CATEGORY_TINT_VAR[category]})` : "var(--secondary)";

  // 하위 할 일: 제목 옆 개수 · 바닥 진행률 바 · 블록이 크면 앞에서부터 목록 (노트는 없음)
  const subtasks = todo.kind === "task" ? subtasksOf(todo.id) : [];
  const subtaskDone = subtasks.filter((s) => s.completed).length;
  const showProgressBar = subtasks.length > 0 && !compact && renderedHeight >= PROGRESS_BAR_MIN_HEIGHT;
  const rowsThatFit = compact
    ? 0
    : Math.max(0, Math.floor((renderedHeight - SUBTASK_HEAD_PX - SUBTASK_FOOT_PX) / SUBTASK_ROW_PX));
  // 다 못 보여주면 마지막 줄을 "외 N개"로
  const visibleSubtasks =
    rowsThatFit >= subtasks.length ? subtasks : subtasks.slice(0, Math.max(0, rowsThatFit - 1));
  const hiddenSubtaskCount = subtasks.length - visibleSubtasks.length;

  if (overlay) {
    return (
      <div
        className="w-[200px] rounded-md px-2.5 py-1.5 shadow-lg"
        style={{ height: renderedHeight, boxShadow: `inset 3px 0 0 ${colorVar}`, backgroundColor: tintVar }}
      >
        <p className="truncate text-[12px] font-semibold text-foreground"><InlineText text={todo.content} /></p>
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
    right: 4,
    transform: CSS.Translate.toString(transform),
    boxShadow: `inset 3px 0 0 ${colorVar}`,
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
          "absolute z-[1] flex touch-none select-none flex-col justify-start overflow-hidden rounded-md py-[5px] pl-[9px] pr-[7px] hover:brightness-[0.98]",
          todo.completed && "opacity-50",
          isDragging && "z-20 opacity-40",
          compact && "flex-row items-center gap-1.5 py-0"
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-1.5", compact && "flex-1")}>
          <span onPointerDown={(e) => e.stopPropagation()} className="flex shrink-0">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => onToggle?.(todo.id)}
              className="size-[13px] border-[1.5px] [&_svg]:size-2.5"
              style={{ borderColor: colorVar, backgroundColor: todo.completed ? colorVar : undefined }}
              aria-label="완료 표시"
            />
          </span>
          <span
            onClick={() => onEdit && setDetailOpen(true)}
            className={cn(
              "min-w-0 flex-1 cursor-pointer truncate text-[12px] font-semibold leading-tight text-foreground",
              todo.completed && "line-through"
            )}
          >
            <InlineText text={todo.content} />
          </span>
          {subtasks.length > 0 ? (
            <span
              className="shrink-0 text-[10.5px] font-bold tabular-nums text-foreground/70"
              aria-label={`하위 할 일 ${subtasks.length}개 중 ${subtaskDone}개 완료`}
            >
              {subtaskDone}/{subtasks.length}
            </span>
          ) : null}
        </div>
        {!compact ? (
          <span className="mt-0.5 truncate pl-[19px] text-[11px] leading-tight text-foreground/70">
            {minutesRangeLabel(startMinutes, duration)}
          </span>
        ) : null}
        {!compact && rowsThatFit > 0 && subtasks.length > 0 ? (
          <div className="mt-1 flex min-w-0 flex-col gap-px pl-[19px]">
            {visibleSubtasks.map((subtask) => (
              <span key={subtask.id} className="flex h-[14px] min-w-0 items-center gap-[5px] text-[11px] leading-none">
                {/* 드래그와 겹치지 않게 pointerdown을 막는다 (부모 체크박스와 같은 방식) */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => subtaskActions.toggle(subtask.id)}
                  aria-label={`${subtask.content} ${subtask.completed ? "완료 취소" : "완료 표시"}`}
                  className="size-2.5 shrink-0 rounded-full border-[1.3px]"
                  style={{ borderColor: colorVar, backgroundColor: subtask.completed ? colorVar : undefined }}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    subtask.completed ? "text-foreground/50 line-through" : "text-foreground"
                  )}
                >
                  <InlineText text={subtask.content} />
                </span>
              </span>
            ))}
            {hiddenSubtaskCount > 0 ? (
              <span className="flex h-[14px] items-center text-[10.5px] leading-none text-foreground/55">
                {visibleSubtasks.length > 0 ? `외 ${hiddenSubtaskCount}개` : `하위 할 일 ${hiddenSubtaskCount}개`}
              </span>
            ) : null}
          </div>
        ) : null}
        {showProgressBar ? (
          <div
            className="mt-auto h-[3px] shrink-0 overflow-hidden rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 20%, transparent)` }}
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${(subtaskDone / subtasks.length) * 100}%`, backgroundColor: colorVar }}
            />
          </div>
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

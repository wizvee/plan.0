"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isBefore, startOfDay } from "date-fns";
import { CaretRight, DotsSixVertical, Note } from "@/components/icons";

import { Checkbox } from "@/components/ui/checkbox";
import { UrlChip } from "@/components/url-chip";
import { InlineText } from "@/components/inline-text";
import { TodoDetailModal } from "@/components/todo-detail-modal";
import { SubtaskProgress } from "@/components/subtask/subtask-progress";
import { SubtaskList } from "@/components/subtask/subtask-list";
import { cn } from "@/lib/utils";
import type { DragSource, DraggedTodoData } from "@/lib/dnd/drop-targets";
import { CATEGORY_COLOR_VAR, getParaCategory } from "@/lib/category";
import type { Area, Project, Resource, Todo, TodoKind } from "@/lib/types";
import { useSubtasks } from "@/lib/app-data/use-subtasks";

function scheduledDateOf(todo: Todo): Date | null {
  return todo.scheduledDate ? new Date(`${todo.scheduledDate}T00:00:00`) : null;
}

interface TodoCardProps {
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
  onConvert?: (id: string, kind: TodoKind) => void;
  overlay?: boolean;
  /** PARA 매핑 표시용 — 이 할 일이 속한 Project/Area/Resource 이름 */
  badge?: string;
  /** 이 카드가 놓인 곳 — Inbox 목록인지 PARA 상세 목록인지 (드롭 처리에서 사용) */
  dragSource?: Extract<DragSource, "inbox" | "container">;
  /** 왼쪽 셰브런으로 하위 할 일을 펼쳐 바로 체크할 수 있게 (PARA 상세 할 일 목록만. Inbox는 개수만) */
  expandable?: boolean;
}

export function TodoCard({
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
  onConvert,
  overlay,
  badge,
  dragSource = "container",
  expandable = false,
}: TodoCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const category = getParaCategory(todo);
  const scheduledDate = scheduledDateOf(todo);
  const isOverdue = scheduledDate ? !todo.completed && isBefore(scheduledDate, startOfDay(new Date())) : false;
  const { progressOf } = useSubtasks();
  // 노트는 하위 할 일 UI가 없다 (노트로 바꿔도 데이터는 남아 있지만 숨김)
  const progress = todo.kind === "task" ? progressOf(todo.id) : { done: 0, total: 0, carried: 0 };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: overlay,
    data: { type: "todo", source: dragSource } satisfies DraggedTodoData,
  });

  const style = overlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  const categoryColor = category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)";
  const showExpander = expandable && !overlay && todo.kind === "task";
  const isExpanded = showExpander && expanded && progress.total > 0;

  return (
    <>
      {/* 펼친 하위 목록도 같이 움직이도록 정렬 노드(ref · transform)는 바깥 래퍼에 */}
      <div ref={overlay ? undefined : setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
        <div
          className={cn(
            "group relative flex items-start gap-3 pl-5 pr-4",
            overlay ? "w-[300px] rounded-xl bg-card shadow-lg ring-1 ring-border" : "hover:bg-black/[0.03]"
          )}
        >
          <button
            type="button"
            aria-label="드래그해서 옮기기"
            className={cn(
              "absolute left-0.5 top-3 flex h-5 w-4 cursor-grab touch-none items-center justify-center text-muted-foreground/50 hover:text-muted-foreground",
              overlay ? "hidden" : "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            )}
            {...(overlay ? {} : { ...attributes, ...listeners })}
          >
            <DotsSixVertical weight="bold" className="size-3.5" />
          </button>
          {showExpander ? (
            progress.total > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                aria-label={isExpanded ? "하위 할 일 접기" : "하위 할 일 펼치기"}
                aria-expanded={isExpanded}
                className="-mr-1 mt-3 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-black/5"
              >
                <CaretRight weight="bold"
                  className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")}
                />
              </button>
            ) : (
              <span className="-mr-1 w-5 shrink-0" aria-hidden="true" />
            )
          ) : null}
          {todo.kind === "note" ? (
            <Note className="mt-3 size-[18px] shrink-0 text-muted-foreground/60" aria-label="노트" />
          ) : (
            <span className="mt-3 shrink-0">
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => onToggle?.(todo.id)}
                aria-label="완료 표시"
                className="size-5"
              />
            </span>
          )}
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-[5px] py-[11px]",
              !overlay && "border-b border-border"
            )}
          >
            <span
              onClick={() => onEdit && setDetailOpen(true)}
              className={cn(
                "min-w-0 cursor-pointer break-words text-[14px] leading-[1.35]",
                todo.completed && "text-muted-foreground line-through"
              )}
            >
              <InlineText text={todo.content} />
            </span>
            {todo.url ? <UrlChip url={todo.url} /> : null}
            {scheduledDate || badge || progress.total > 0 ? (
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
                <SubtaskProgress
                  progress={progress}
                  color={categoryColor}
                />
                {scheduledDate ? (
                  <span className={cn("font-medium tabular-nums", isOverdue && "text-destructive")}>
                    {format(scheduledDate, "yyyy. M. d.")}
                  </span>
                ) : null}
                {badge ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    {category ? (
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ backgroundColor: `var(${CATEGORY_COLOR_VAR[category]})` }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="truncate">{badge}</span>
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
        {isExpanded ? (
          // 하위 체크박스가 할 일 제목 시작점(80px)에 오도록: 목록 행 안쪽 여백(그립 자리) 20px을 뺀 60px
          <SubtaskList todoId={todo.id} color={categoryColor} className="pl-[60px] pr-4" />
        ) : null}
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
          onConvert={(id, kind) => onConvert?.(id, kind)}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}

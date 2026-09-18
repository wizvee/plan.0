"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isBefore, startOfDay } from "date-fns";
import { GripVertical, StickyNote } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { UrlChip } from "@/components/url-chip";
import { TodoDetailModal } from "@/components/todo-detail-modal";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, getParaCategory } from "@/lib/category";
import type { Area, Project, Resource, Todo, TodoKind } from "@/lib/types";

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
}: TodoCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const category = !badge ? getParaCategory(todo) : null;
  const scheduledDate = scheduledDateOf(todo);
  const isOverdue = scheduledDate ? !todo.completed && isBefore(scheduledDate, startOfDay(new Date())) : false;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: overlay,
  });

  const style = overlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  return (
    <>
      <div
        ref={overlay ? undefined : setNodeRef}
        style={style}
        className={cn(
          "flex items-start gap-2.5 bg-card py-2.5",
          isDragging && "opacity-40",
          overlay && "rounded-[10px] px-3 shadow-lg ring-1 ring-border"
        )}
      >
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
          aria-label="드래그 핸들"
          {...(overlay ? {} : { ...attributes, ...listeners })}
        >
          <GripVertical className="size-4" />
        </button>
        {todo.kind === "note" ? (
          <StickyNote className="mt-0.5 size-[18px] shrink-0 text-muted-foreground/60" aria-hidden="true" />
        ) : (
          <Checkbox
            checked={todo.completed}
            onCheckedChange={() => onToggle?.(todo.id)}
            aria-label="완료 표시"
            className="mt-0.5"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex min-w-0 items-start gap-1.5">
            <span
              onClick={() => onEdit && setDetailOpen(true)}
              className={cn(
                "min-w-0 flex-1 cursor-pointer break-words text-[15px] leading-snug",
                todo.completed && "text-muted-foreground"
              )}
            >
              {todo.content}
            </span>
            {category ? (
              <span
                className="mt-1.5 size-[7px] shrink-0 rounded-full"
                style={{ backgroundColor: `var(${CATEGORY_COLOR_VAR[category]})` }}
                aria-hidden="true"
              />
            ) : null}
          </span>
          {todo.url ? <UrlChip url={todo.url} /> : null}
          {scheduledDate || badge ? (
            <span className="flex flex-wrap items-center gap-2">
              {scheduledDate ? (
                <span
                  className={cn(
                    "text-[12px] font-semibold",
                    isOverdue ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {format(scheduledDate, "yyyy. M. d.")}
                </span>
              ) : null}
              {badge ? (
                <span className="w-fit rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                  {badge}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
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

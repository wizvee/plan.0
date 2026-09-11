"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { UrlChip } from "@/components/url-chip";
import { TodoDetailModal } from "@/components/todo-detail-modal";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/types";

interface TodoCardProps {
  todo: Todo;
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onMemoEdit?: (id: string, memo: string) => void;
  overlay?: boolean;
}

export function TodoCard({ todo, onToggle, onRemove, onEdit, onMemoEdit, overlay }: TodoCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

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
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle?.(todo.id)}
          aria-label="완료 표시"
          className="mt-0.5"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span
            onClick={() => onEdit && setDetailOpen(true)}
            className={cn(
              "min-w-0 flex-1 cursor-pointer break-words text-[15px] leading-snug",
              todo.completed && "text-muted-foreground"
            )}
          >
            {todo.content}
          </span>
          {todo.url ? <UrlChip url={todo.url} /> : null}
        </div>
      </div>
      {detailOpen ? (
        <TodoDetailModal
          todo={todo}
          onEdit={(id, content) => onEdit?.(id, content)}
          onMemoEdit={(id, memo) => onMemoEdit?.(id, memo)}
          onRemove={(id) => onRemove?.(id)}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}

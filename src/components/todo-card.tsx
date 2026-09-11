"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/types";

interface TodoCardProps {
  todo: Todo;
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  overlay?: boolean;
}

export function TodoCard({ todo, onToggle, onRemove, onEdit, overlay }: TodoCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.content);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: overlay,
  });

  const style = overlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== todo.content) {
      onEdit?.(todo.id, trimmed);
    } else {
      setDraft(todo.content);
    }
    setEditing(false);
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2.5 bg-card py-2.5",
        isDragging && "opacity-40",
        overlay && "rounded-[10px] px-3 shadow-lg ring-1 ring-border"
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
        aria-label="드래그 핸들"
        {...(overlay ? {} : { ...attributes, ...listeners })}
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggle?.(todo.id)}
        aria-label="완료 표시"
      />
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") {
              setDraft(todo.content);
              setEditing(false);
            }
          }}
          className="h-7 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
        />
      ) : (
        <span
          onClick={() => onEdit && setEditing(true)}
          className={cn(
            "flex-1 cursor-text break-words text-[15px] leading-snug",
            todo.completed && "text-muted-foreground"
          )}
        >
          {todo.content}
        </span>
      )}
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
          onClick={() => onRemove(todo.id)}
          aria-label="삭제"
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

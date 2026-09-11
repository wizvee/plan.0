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
        "group flex items-start gap-1.5 rounded-md border bg-card px-2 py-1.5 text-sm shadow-sm",
        isDragging && "opacity-40",
        overlay && "rotate-1 shadow-lg"
      )}
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
        aria-label="드래그 핸들"
        {...(overlay ? {} : { ...attributes, ...listeners })}
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggle?.(todo.id)}
        className="mt-0.5"
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
          className="h-7 flex-1 px-1 text-sm"
        />
      ) : (
        <span
          onClick={() => onEdit && setEditing(true)}
          className={cn(
            "flex-1 cursor-text break-words leading-snug",
            todo.completed && "text-muted-foreground line-through"
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
          className="size-6 opacity-0 group-hover:opacity-100"
          onClick={() => onRemove(todo.id)}
          aria-label="삭제"
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

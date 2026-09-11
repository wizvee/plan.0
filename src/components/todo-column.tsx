"use client";

import { useDroppable } from "@dnd-kit/core";

import { TodoCard } from "@/components/todo-card";
import { AddTodoForm } from "@/components/add-todo-form";
import { cn } from "@/lib/utils";
import type { ColumnKey, Todo } from "@/lib/types";

interface TodoColumnProps {
  id: ColumnKey;
  title: string;
  items: Todo[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onAdd?: (content: string) => void;
  isToday?: boolean;
  className?: string;
}

export function TodoColumn({
  id,
  title,
  items,
  onToggle,
  onRemove,
  onEdit,
  onAdd,
  isToday,
  className,
}: TodoColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-card shadow-[0_1px_1px_rgba(0,0,0,0.03)] ring-1 transition-shadow",
        isOver ? "ring-2 ring-primary/60" : isToday ? "ring-[1.5px] ring-primary" : "ring-border",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-3">
        <div className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[15px] font-semibold">{title}</span>
        {isToday ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary">
            오늘
          </span>
        ) : null}
        <span className="ml-auto text-sm text-muted-foreground">
          {items.length > 0 ? items.length : ""}
        </span>
      </div>
      <div ref={setNodeRef} className="flex flex-1 flex-col divide-y divide-border/70 px-3.5">
        {items.map((todo) => (
          <TodoCard key={todo.id} todo={todo} onToggle={onToggle} onRemove={onRemove} onEdit={onEdit} />
        ))}
        {onAdd ? <AddTodoForm onAdd={onAdd} /> : null}
      </div>
      <div className="pb-2.5" />
    </div>
  );
}

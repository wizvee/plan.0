"use client";

import { useDroppable } from "@dnd-kit/core";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  highlight?: boolean;
}

export function TodoColumn({
  id,
  title,
  items,
  onToggle,
  onRemove,
  onEdit,
  onAdd,
  highlight,
}: TodoColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card
      className={cn(
        "min-w-0 gap-2 py-3",
        highlight && "border-primary/40"
      )}
    >
      <CardHeader className="px-3">
        <CardTitle className="flex items-center justify-between text-sm">
          {title}
          <span className="text-xs font-normal text-muted-foreground">
            {items.length > 0 ? items.length : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "min-h-[360px] flex-1 gap-1.5 rounded-md px-2 py-1 transition-colors",
          isOver && "bg-accent"
        )}
      >
        {items.map((todo) => (
          <TodoCard key={todo.id} todo={todo} onToggle={onToggle} onRemove={onRemove} onEdit={onEdit} />
        ))}
        {onAdd ? <AddTodoForm onAdd={onAdd} /> : null}
      </CardContent>
    </Card>
  );
}

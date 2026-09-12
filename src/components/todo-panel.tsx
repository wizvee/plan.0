"use client";

import { useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";

import { TodoCard } from "@/components/todo-card";
import { AddTodoForm } from "@/components/add-todo-form";
import { cn } from "@/lib/utils";
import { BACKLOG, type Todo } from "@/lib/types";

interface TodoPanelProps {
  items: Todo[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onAdd: (content: string) => void;
  onClose: () => void;
  /** PARA 목록 화면에서 재사용할 때, 이미 매핑된 항목에 보여줄 배지 텍스트 */
  getBadge?: (todo: Todo) => string | undefined;
}

export function TodoPanel({ items, onToggle, onRemove, onEdit, onMemoEdit, onAdd, onClose, getBadge }: TodoPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG });

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 sm:hidden" onClick={onClose} aria-hidden="true" />
      <div className="fixed left-0 right-0 bottom-14 top-auto z-40 flex h-[55vh] flex-col rounded-t-2xl border-t border-r border-b border-l border-border bg-card sm:left-auto sm:right-14 sm:top-0 sm:bottom-0 sm:h-auto sm:w-[85vw] sm:max-w-[340px] sm:rounded-none sm:border-t-0 sm:border-r-0 sm:border-b-0">
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1.5 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
          <div className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[16px] font-semibold">Todo List</span>
          <span className="ml-auto text-sm text-muted-foreground">
            {items.length > 0 ? items.length : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-1 flex-col divide-y divide-border/70 overflow-y-auto px-4 transition-colors",
            isOver && "bg-accent/30"
          )}
        >
          {items.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onRemove={onRemove}
              onEdit={onEdit}
              onMemoEdit={onMemoEdit}
              badge={getBadge?.(todo)}
            />
          ))}
          <AddTodoForm onAdd={onAdd} />
        </div>
      </div>
    </>
  );
}

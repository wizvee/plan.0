"use client";

import { useEffect, useState } from "react";
import { StickyNote, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { UrlChip } from "@/components/url-chip";
import type { Todo, TodoKind } from "@/lib/types";

interface TodoDetailModalProps {
  todo: Todo;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onRemove: (id: string) => void;
  onConvert?: (id: string, kind: TodoKind) => void;
  onClose: () => void;
}

export function TodoDetailModal({ todo, onEdit, onMemoEdit, onRemove, onConvert, onClose }: TodoDetailModalProps) {
  const [title, setTitle] = useState(todo.content);
  const [memo, setMemo] = useState(todo.memo ?? "");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== todo.content) {
      onEdit(todo.id, trimmed);
    } else {
      setTitle(todo.content);
    }
  }

  function commitMemo() {
    const trimmed = memo.trim();
    if (trimmed !== (todo.memo ?? "")) {
      onMemoEdit(todo.id, trimmed);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col rounded-2xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[19px] font-bold shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={commitMemo}
          placeholder="메모"
          rows={3}
          className="mt-2 resize-y border-0 bg-transparent p-0 text-[15px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
        />
        {todo.url ? (
          <>
            <div className="my-3 border-t border-border" />
            <UrlChip url={todo.url} />
          </>
        ) : null}
        {onConvert ? (
          <button
            type="button"
            onClick={() => onConvert(todo.id, todo.kind === "note" ? "task" : "note")}
            className="mt-5 flex items-center justify-center gap-1.5 self-center rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <StickyNote className="size-3.5" />
            {todo.kind === "note" ? "할 일로 전환" : "노트로 전환"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onRemove(todo.id);
            onClose();
          }}
          aria-label="삭제"
          className="mt-2 flex size-11 items-center justify-center self-center rounded-full text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-5" />
        </button>
      </div>
    </div>
  );
}

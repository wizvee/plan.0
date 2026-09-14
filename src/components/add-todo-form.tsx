"use client";

import { useState } from "react";
import { Plus, StickyNote } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TodoKind } from "@/lib/types";

export function AddTodoForm({ onAdd }: { onAdd: (content: string, kind: TodoKind) => void }) {
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<TodoKind>("task");

  function submit() {
    if (!value.trim()) return;
    onAdd(value, kind);
    setValue("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2.5 py-2.5"
    >
      <button
        type="submit"
        className="flex size-[21px] shrink-0 items-center justify-center text-muted-foreground disabled:opacity-40"
        aria-label="추가"
        disabled={!value.trim()}
      >
        <Plus className="size-[18px]" />
      </button>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={kind === "task" ? "할 일 추가" : "노트 추가"}
        className="h-auto flex-1 border-0 bg-transparent px-0 text-[15px] text-muted-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus:text-foreground"
      />
      <button
        type="button"
        onClick={() => setKind((k) => (k === "task" ? "note" : "task"))}
        aria-pressed={kind === "note"}
        aria-label="할 일/노트 전환"
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
          kind === "note" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
        )}
      >
        <StickyNote className="size-3" />
        {kind === "task" ? "할일" : "노트"}
      </button>
    </form>
  );
}

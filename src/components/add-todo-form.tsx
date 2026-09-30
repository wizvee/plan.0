"use client";

import { useState } from "react";
import { Plus } from "@/components/icons";

import { cn } from "@/lib/utils";
import type { TodoKind } from "@/lib/types";

/** Inbox 맨 위 입력창 — 오른쪽 세그먼트로 할 일/노트를 고른 뒤 Enter로 추가. */
export function AddTodoForm({ onAdd }: { onAdd: (content: string, kind: TodoKind) => void }) {
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<TodoKind>("task");

  function submit() {
    if (!value.trim()) return;
    onAdd(value, kind);
    setValue("");
  }

  const placeholder = kind === "task" ? "새 할 일" : "새 노트";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex h-[42px] items-center gap-2 rounded-[10px] border border-border bg-card pl-3 pr-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <button
        type="submit"
        aria-label="추가"
        disabled={!value.trim()}
        className="flex shrink-0 items-center justify-center text-primary disabled:opacity-60"
      >
        <Plus className="size-[18px]" />
      </button>
      <input
        data-add-input=""
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
      />
      <div role="group" aria-label="추가할 종류" className="flex shrink-0 rounded-[7px] bg-black/[0.06] p-0.5">
        {(["task", "note"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={cn(
              "h-[26px] rounded-[5px] px-2.5 text-[12px] font-semibold text-muted-foreground",
              kind === k && "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            )}
          >
            {k === "task" ? "할 일" : "노트"}
          </button>
        ))}
      </div>
    </form>
  );
}

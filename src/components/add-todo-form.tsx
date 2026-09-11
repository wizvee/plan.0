"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Input } from "@/components/ui/input";

export function AddTodoForm({ onAdd }: { onAdd: (content: string) => void }) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    onAdd(value);
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
        placeholder="할 일 추가"
        className="h-auto flex-1 border-0 bg-transparent px-0 text-[15px] text-muted-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus:text-foreground"
      />
    </form>
  );
}

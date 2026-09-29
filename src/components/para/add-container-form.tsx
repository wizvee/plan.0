"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Input } from "@/components/ui/input";

export function AddContainerForm({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
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
      className="flex min-h-[96px] items-center gap-2.5 rounded-[4px] border-[1.5px] border-dashed border-black/15 px-4 py-3 focus-within:border-primary/50"
    >
      <button
        type="submit"
        className="flex size-[21px] shrink-0 items-center justify-center text-primary disabled:text-muted-foreground"
        aria-label="추가"
        disabled={!value.trim()}
      >
        <Plus className="size-[18px]" />
      </button>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-auto flex-1 border-0 bg-transparent px-0 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
      />
    </form>
  );
}

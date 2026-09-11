"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      className="flex items-center gap-1.5 pt-1"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="할 일 추가"
        className="h-8 text-sm"
      />
      <Button
        type="submit"
        size="icon"
        variant="outline"
        className="size-8 shrink-0"
        aria-label="추가"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

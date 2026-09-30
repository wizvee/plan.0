"use client";

import { useState } from "react";
import { Plus } from "@/components/icons";

/**
 * PARA 상세 할 일 목록 맨 위 "새 할 일" 줄 (PARA-MANAGE-PLAN.md 2-1). Enter로 추가하고 입력칸은 비운 채 남아서
 * 연속으로 적을 수 있다. 한글 조합 중 Enter는 무시(안 하면 마지막 글자가 한 번 더 들어간다), Esc는 입력 취소.
 * + 아이콘과 입력칸은 아래 할 일 카드의 체크박스 · 제목 시작점(48px · 80px)에 맞춘다.
 */
export function AddMappedTodoRow({ label, onAdd }: { label: string; onAdd: (content: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <label className="flex min-h-[46px] cursor-text items-center gap-3 border-b border-border pl-12 pr-4 text-primary">
      <Plus className="size-5 shrink-0" aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!value.trim()) return;
            onAdd(value);
            setValue("");
          } else if (e.key === "Escape") {
            setValue("");
          }
        }}
        enterKeyHint="done"
        placeholder="새 할 일"
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent py-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground sm:text-[14px]"
      />
      {value.trim() ? (
        <span className="hidden whitespace-nowrap text-[12px] text-muted-foreground sm:inline">Enter로 추가 · Esc 취소</span>
      ) : null}
    </label>
  );
}

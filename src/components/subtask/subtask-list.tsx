"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/lib/types";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useSubtaskActions } from "@/lib/app-data/subtask-actions";

/** 한글 조합 중 Enter는 무시 — 안 하면 마지막 글자가 한 번 더 들어간다. */
function isCommitEnter(e: KeyboardEvent<HTMLInputElement>) {
  return e.key === "Enter" && !e.nativeEvent.isComposing;
}

/**
 * 할 일 하나의 하위 할 일 체크리스트 + 맨 아래 "하위 할 일 추가" 입력.
 * 상세 모달과 PARA 상세 펼침이 같이 쓴다. 데이터 · 동작은 훅으로 직접 읽는다(props로 핸들러를 받지 않음).
 * `color`는 체크박스 색 — 할 일의 카테고리 색(CSS 값).
 */
export function SubtaskList({ todoId, color, className }: { todoId: string; color: string; className?: string }) {
  const { subtasksOf } = useSubtasks();
  const actions = useSubtaskActions();
  const [draft, setDraft] = useState("");
  const items = subtasksOf(todoId);

  function submitDraft() {
    if (!draft.trim()) return;
    actions.add(todoId, draft);
    setDraft("");
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((subtask) => (
        // content를 key에 넣어 다른 기기에서 바뀐 내용이 오면 입력칸을 새 값으로 초기화
        <SubtaskRow key={`${subtask.id}:${subtask.content}`} subtask={subtask} color={color} />
      ))}
      <label className="flex min-h-10 items-center gap-2.5 pl-2.5 pr-2 text-primary">
        <Plus className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (isCommitEnter(e)) {
              e.preventDefault();
              submitDraft(); // 포커스는 그대로 — 연속 입력
            }
          }}
          onBlur={submitDraft}
          placeholder="하위 할 일 추가"
          aria-label="하위 할 일 추가"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>
    </div>
  );
}

function SubtaskRow({ subtask, color }: { subtask: Subtask; color: string }) {
  const actions = useSubtaskActions();
  const [text, setText] = useState(subtask.content);

  function commit() {
    if (text.trim() === subtask.content) {
      setText(subtask.content);
      return;
    }
    actions.edit(subtask.id, text); // 비우면 삭제
  }

  const checkboxStyle: CSSProperties = {
    borderColor: color,
    backgroundColor: subtask.completed ? color : undefined,
  };

  return (
    <div className="group flex min-h-10 items-center gap-2.5 border-b border-border pl-2.5 pr-1.5 hover:bg-black/[0.03]">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={() => actions.toggle(subtask.id)}
        aria-label={subtask.completed ? "완료 취소" : "완료 표시"}
        className="size-5 text-white"
        style={checkboxStyle}
      />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (isCommitEnter(e)) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label="하위 할 일 내용"
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[14px] outline-none",
          subtask.completed && "text-muted-foreground line-through"
        )}
      />
      <button
        type="button"
        onClick={() => actions.remove(subtask.id)}
        aria-label="하위 할 일 삭제"
        className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <X className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, GripVertical, Plus, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/lib/types";
import type { DraggedSubtaskData } from "@/lib/dnd/drop-targets";
import { carryShortDateLabel, nextWeekday } from "@/lib/carry-over";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useTodos } from "@/lib/app-data/use-todos";
import { useSubtaskActions } from "@/lib/app-data/subtask-actions";

/** 한글 조합 중 Enter는 무시 — 안 하면 마지막 글자가 한 번 더 들어간다. */
function isCommitEnter(e: KeyboardEvent<HTMLInputElement>) {
  return e.key === "Enter" && !e.nativeEvent.isComposing;
}

/**
 * 할 일 하나의 하위 할 일 체크리스트 + 맨 아래 "하위 할 일 추가" 입력.
 * 상세 모달과 PARA 상세 펼침이 같이 쓴다. 데이터 · 동작은 훅으로 직접 읽는다(props로 핸들러를 받지 않음).
 * 순서는 그립으로 끌어서 바꾼다 — 앱 하나뿐인 DndProvider를 쓰고, 처리는 `lib/dnd/handle-drop.ts`.
 * `color`는 체크박스 색 — 할 일의 카테고리 색(CSS 값).
 */
export function SubtaskList({ todoId, color, className }: { todoId: string; color: string; className?: string }) {
  const { subtasksOf } = useSubtasks();
  const { todos } = useTodos();
  const actions = useSubtaskActions();
  const [draft, setDraft] = useState("");
  const items = subtasksOf(todoId);
  // 넘긴 항목 옆 "9/29 (화)로 넘김" — 넘기면 할 일이 완료돼 끌어 옮길 수 없으므로(완료를 풀지 않는 한) 날짜에서 다시 계산한다
  const scheduledDate = todos.find((t) => t.id === todoId)?.scheduledDate ?? null;
  const carriedLabel = scheduledDate ? `${carryShortDateLabel(nextWeekday(scheduledDate))}로 넘김` : "넘김";

  function submitDraft() {
    if (!draft.trim()) return;
    actions.add(todoId, draft);
    setDraft("");
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {items.map((subtask) => (
          // content를 key에 넣어 다른 기기에서 바뀐 내용이 오면 입력칸을 새 값으로 초기화
          <SubtaskRow
            key={`${subtask.id}:${subtask.content}`}
            subtask={subtask}
            color={color}
            carriedLabel={carriedLabel}
          />
        ))}
      </SortableContext>
      <label className="flex min-h-10 items-center gap-2.5 pl-5 pr-2 text-primary">
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

function SubtaskRow({ subtask, color, carriedLabel }: { subtask: Subtask; color: string; carriedLabel: string }) {
  const actions = useSubtaskActions();
  const [text, setText] = useState(subtask.content);
  // 평소엔 `코드`가 보이도록 렌더링된 텍스트, 누르면 원문을 고치는 입력칸
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.id,
    data: { type: "subtask", todoId: subtask.todoId } satisfies DraggedSubtaskData,
  });

  function commit() {
    setEditing(false);
    if (text.trim() === subtask.content) {
      setText(subtask.content);
      return;
    }
    actions.edit(subtask.id, text); // 비우면 삭제
  }

  // 넘긴 항목 — 그날 못 했다는 기록. 체크 · 수정 · 삭제 · 순서 변경 없이 회색 화살표로만 보여준다.
  if (subtask.carriedAt) {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className="flex min-h-10 items-center gap-2.5 border-b border-border bg-black/[0.02] pl-5 pr-3"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-muted-foreground">
          <ArrowRight className="size-3" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 break-words py-2.5 text-[14px] text-muted-foreground">
          <InlineText text={subtask.content} />
        </span>
        <span className="shrink-0 text-[12px] text-muted-foreground">{carriedLabel}</span>
      </div>
    );
  }

  const checkboxStyle: CSSProperties = {
    borderColor: color,
    backgroundColor: subtask.completed ? color : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex min-h-10 items-center gap-2.5 border-b border-border bg-card pl-5 pr-1.5 hover:bg-black/[0.03]",
        isDragging && "opacity-40"
      )}
    >
      {/* 행 왼쪽 여백(20px)에 두는 그립 — 모바일은 항상, 데스크톱은 hover 시 (TodoCard와 같은 규칙) */}
      <button
        type="button"
        aria-label="끌어서 순서 바꾸기"
        className="absolute left-0.5 top-1/2 flex h-5 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center text-muted-foreground/50 hover:text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={() => actions.toggle(subtask.id)}
        aria-label={subtask.completed ? "완료 취소" : "완료 표시"}
        className="size-5 text-white"
        style={checkboxStyle}
      />
      {editing ? (
        <input
          type="text"
          autoFocus
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
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`${subtask.content} — 눌러서 수정`}
          className={cn(
            "min-w-0 flex-1 cursor-text break-words py-2.5 text-left text-[14px]",
            subtask.completed && "text-muted-foreground line-through"
          )}
        >
          <InlineText text={subtask.content} />
        </button>
      )}
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

/** 하위 할 일을 끄는 동안 DragOverlay에 보이는 한 줄 미리보기 (dnd-provider.tsx). */
export function SubtaskDragPreview({ subtask }: { subtask: Subtask }) {
  return (
    <div className="flex h-10 w-[280px] items-center gap-2.5 rounded-lg bg-card px-3 text-[14px] shadow-lg ring-1 ring-border">
      <span
        className={cn(
          "size-5 shrink-0 rounded-full border-[1.6px] border-black/25",
          subtask.completed && "border-transparent bg-muted-foreground"
        )}
      />
      <span className={cn("truncate", subtask.completed && "text-muted-foreground line-through")}>
        <InlineText text={subtask.content} />
      </span>
    </div>
  );
}

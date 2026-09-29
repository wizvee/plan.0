"use client";

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, FolderInput, GripVertical, Plus, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/lib/types";
import type { DraggedSubtaskData } from "@/lib/dnd/drop-targets";
import { carryShortDateLabel, nextWeekday } from "@/lib/carry-over";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useTodos } from "@/lib/app-data/use-todos";
import { useSubtaskActions } from "@/lib/app-data/subtask-actions";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import { useContainers } from "@/lib/app-data/use-containers";

/** "나중에"로 보낸 뒤 되돌리기 알림이 떠 있는 시간 */
const LATER_TOAST_MS = 5000;

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
  const { moveSubtaskToLater } = useTodoActions();
  const { containerNameOf } = useContainers();
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<{ message: string; undo: () => void } | null>(null);
  const items = subtasksOf(todoId);
  const parent = todos.find((t) => t.id === todoId);
  // "나중에"로 보낼 곳 — 부모 할 일과 같은 PARA, 없으면 Inbox
  const laterTarget = parent ? containerNameOf(parent) : undefined;
  const laterLabel = laterTarget ? `${laterTarget} 할 일로` : "Inbox로";
  // 넘긴 항목 옆 "9/29 (화)로 넘김" — 넘기면 할 일이 완료돼 끌어 옮길 수 없으므로(완료를 풀지 않는 한) 날짜에서 다시 계산한다
  const scheduledDate = parent?.scheduledDate ?? null;
  const carriedLabel = scheduledDate ? `${carryShortDateLabel(nextWeekday(scheduledDate))}로 넘김` : "넘김";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), LATER_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function sendLater(subtask: Subtask) {
    const undo = await moveSubtaskToLater(subtask.id);
    if (undo) setToast({ message: `${subtask.content} → ${laterLabel} 보냈어요`, undo });
  }

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
            laterTitle={`나중에 — ${laterLabel} 보내기 (날짜 없이 옮겨서 Inbox에도 보여요 · 넘김 기록은 안 남아요)`}
            onLater={() => void sendLater(subtask)}
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
      {toast ? (
        <LaterToast
          message={toast.message}
          onUndo={() => {
            toast.undo();
            setToast(null);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * "나중에" 뒤 되돌리기 알림 — 화면 아래 가운데. body 포털(모달 · Inbox 패널의 쌓임 맥락에 갇히지 않게).
 * 클릭은 부모(할 일 카드 등)로 올라가지 않게 막는다 — 포털이어도 React 이벤트는 컴포넌트 트리를 따라 올라간다.
 */
function LaterToast({ message, onUndo }: { message: string; onUndo: () => void }) {
  return createPortal(
    <div
      role="status"
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-[calc(24px+var(--tabbar-h,0px))] left-1/2 z-[80] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-[10px] bg-foreground/[0.92] px-3.5 py-2.5 text-[13px] text-background shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
    >
      <FolderInput className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 truncate">
        <InlineText text={message} />
      </span>
      <button type="button" onClick={onUndo} className="shrink-0 font-bold text-accent hover:opacity-80">
        되돌리기
      </button>
    </div>,
    document.body
  );
}

function SubtaskRow({
  subtask,
  color,
  carriedLabel,
  laterTitle,
  onLater,
}: {
  subtask: Subtask;
  color: string;
  carriedLabel: string;
  laterTitle: string;
  onLater: () => void;
}) {
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
      {/* 나중에 — 안 끝난 항목만. 삭제(×)와 헷갈리지 않게 글자까지 쓴다. 모바일은 항상, 데스크톱은 hover 시 */}
      {!subtask.completed ? (
        <button
          type="button"
          onClick={onLater}
          title={laterTitle}
          aria-label={laterTitle}
          className="flex h-[26px] shrink-0 items-center gap-1 rounded-md bg-black/[0.06] pl-1.5 pr-2 text-[12.5px] font-semibold text-foreground hover:bg-black/10 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <FolderInput className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
          나중에
        </button>
      ) : null}
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

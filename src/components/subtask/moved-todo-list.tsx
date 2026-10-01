"use client";

import { format, parseISO } from "date-fns";
import { CaretRight, Check, FolderSimplePlus } from "@/components/icons";

import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/types";
import { useParaColor } from "@/lib/app-data/use-para-color";

/**
 * 원래 할 일에서 "나중에"로 옮겨 간 할 일들(역링크, LINKS-PLAN.md) — 상세 팝업 하위 할 일 탭의 체크리스트 아래.
 * "나중에"는 하위 할 일을 지우므로, 회의 같은 할 일에서 무엇이 나갔는지 여기서 본다. 진행률에는 넣지 않는다.
 * 줄을 누르면 그 할 일을 연다. 없으면 아무것도 그리지 않는다.
 */
export function MovedTodoList({ todos, onOpen }: { todos: Todo[]; onOpen: (todo: Todo) => void }) {
  const paraColor = useParaColor();
  if (todos.length === 0) return null;
  return (
    <section aria-label="나중에로 옮긴 할 일" className="flex shrink-0 flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 px-0.5 text-[12px] font-semibold text-muted-foreground">
        <FolderSimplePlus weight="bold" className="size-3.5" aria-hidden="true" />
        나중에로 옮긴 할 일
        <span className="tabular-nums">{todos.length}</span>
      </h3>
      <ul className="max-h-[122px] overflow-y-auto rounded-[10px] border border-border">
        {todos.map((todo) => {
          const color = paraColor.ofMapping(todo).color;
          return (
            <li key={todo.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onOpen(todo)}
                className="flex min-h-10 w-full items-center gap-2.5 pl-3 pr-2 text-left hover:bg-black/[0.03]"
              >
                {todo.completed ? (
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: color }}
                    aria-label="완료"
                  >
                    <Check weight="bold" className="size-3" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-muted-foreground">
                    <FolderSimplePlus weight="bold" className="size-3" aria-hidden="true" />
                  </span>
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate py-2.5 text-[14px]",
                    todo.completed && "text-muted-foreground line-through"
                  )}
                >
                  <InlineText text={todo.content} />
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                  {todo.scheduledDate ? format(parseISO(todo.scheduledDate), "M/d") : "날짜 없음"}
                </span>
                <CaretRight weight="bold" className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

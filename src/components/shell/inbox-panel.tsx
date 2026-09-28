"use client";

import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PanelLeftClose } from "lucide-react";

import { TodoCard } from "@/components/todo-card";
import { AddTodoForm } from "@/components/add-todo-form";
import { cn } from "@/lib/utils";
import { BACKLOG } from "@/lib/types";
import type { DropTargetData } from "@/lib/dnd/drop-targets";
import { useTodos } from "@/lib/app-data/use-todos";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import { useShellUI } from "@/lib/shell-ui";

/**
 * Inbox(할 일 보관함) — 데스크톱은 레일 옆에서 본문을 밀어내는 320px 패널(본문을 가리지 않음),
 * 모바일은 하단 탭 위로 올라오는 바텀시트. 앱에 하나만 마운트된다(보관함 드롭 영역 · SortableContext가
 * 둘 이상이면 안 되므로).
 */
export function InboxPanel() {
  const { backlogItems: items } = useTodos();
  const { projects, areas, resources, containerNameOf } = useContainers();
  const actions = useTodoActions();
  const { inboxOpen, setInboxOpen, focusRequest } = useShellUI();
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG, data: { type: "inbox" } satisfies DropTargetData });
  const panelRef = useRef<HTMLElement>(null);

  // 캘린더 툴바의 "+"로 열었으면 입력창에 포커스
  useEffect(() => {
    if (focusRequest > 0) panelRef.current?.querySelector<HTMLInputElement>("[data-add-input]")?.focus();
  }, [focusRequest, inboxOpen]);

  if (!inboxOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 sm:hidden" onClick={() => setInboxOpen(false)} aria-hidden="true" />
      <aside
        ref={panelRef}
        aria-label="Inbox"
        className={cn(
          "fixed inset-x-0 bottom-16 z-40 flex h-[62vh] flex-col rounded-t-xl border border-border bg-panel shadow-lg",
          "sm:sticky sm:top-0 sm:bottom-auto sm:z-auto sm:h-screen sm:w-[320px] sm:shrink-0 sm:rounded-none sm:border-0 sm:border-r sm:shadow-none"
        )}
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1.5 w-9 rounded-full bg-black/15" />
        </div>
        <div className="flex items-center gap-2 pb-0.5 pl-5 pr-3 pt-3 sm:pt-4">
          <h2 className="text-[22px] font-bold tracking-[-0.4px]">Inbox</h2>
          <span className="text-[15px] font-medium text-muted-foreground">{items.length > 0 ? items.length : ""}</span>
          <button
            type="button"
            onClick={() => setInboxOpen(false)}
            aria-label="Inbox 닫기"
            className="ml-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-black/5"
          >
            <PanelLeftClose className="size-[18px]" strokeWidth={1.8} />
          </button>
        </div>
        <p className="px-5 pb-3.5 text-[12.5px] text-muted-foreground">날짜 없는 할 일 · 분류 안 된 노트</p>

        <div className="mx-3 mb-1.5">
          <AddTodoForm onAdd={actions.addToInbox} />
        </div>

        <div
          ref={setNodeRef}
          className={cn("min-h-0 flex-1 overflow-y-auto pt-1 transition-colors", isOver && "bg-accent/40")}
        >
          <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {items.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                dragSource="inbox"
                projects={projects}
                areas={areas}
                resources={resources}
                onToggle={actions.toggle}
                onRemove={actions.remove}
                onEdit={actions.edit}
                onMemoEdit={actions.editMemo}
                onUrlEdit={actions.editUrl}
                onAssignPara={actions.assignPara}
                onConvert={actions.convert}
                badge={containerNameOf(todo)}
              />
            ))}
          </SortableContext>
          {items.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">Inbox가 비어 있어요</p>
          ) : null}
        </div>

        <p className="hidden border-t border-border px-5 pb-4 pt-3 text-[12px] text-muted-foreground sm:block">
          캘린더 · PARA 카드로 끌어다 놓아 배치 / 분류
        </p>
      </aside>
    </>
  );
}

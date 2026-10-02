"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDndMonitor, useDroppable, type DragOverEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, type SortingStrategy } from "@dnd-kit/sortable";
import { CaretDown, SidebarSimple } from "@/components/icons";

import { TodoCard } from "@/components/todo-card";
import { TodoDetailById } from "@/components/todo-detail-by-id";
import { AddTodoForm } from "@/components/add-todo-form";
import { cn } from "@/lib/utils";
import { BACKLOG, type Todo } from "@/lib/types";
import type { ActiveData, DropTargetData, OverData } from "@/lib/dnd/drop-targets";
import {
  UNSORTED_GROUP_KEY,
  groupInboxItems,
  inboxGroupKey,
  mappingOfGroup,
  useInboxExpanded,
  type InboxGroup,
} from "@/lib/inbox-groups";
import { useTodos } from "@/lib/app-data/use-todos";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import { useShellUI } from "@/lib/shell-ui";
import { useParaColor } from "@/lib/app-data/use-para-color";

/**
 * Inbox(할 일 보관함) — 데스크톱은 레일 옆에서 본문을 밀어내는 320px 패널(본문을 가리지 않음),
 * 모바일은 하단 탭 위로 올라오는 바텀시트. 앱에 하나만 마운트된다(보관함 드롭 영역 · 보관함 카드의
 * SortableContext가 둘 이상이면 안 되므로).
 *
 * 항목은 PARA별 그룹으로 묶는다(INBOX-GROUPS-PLAN.md) — 기본은 접힘, 펼친 그룹만 기억. 카드를 다른 그룹에 놓으면 그 PARA가 된다.
 * 할 일 상세 팝업은 패널이 연다 — 팝업에서 PARA를 바꾸면 카드가 다른 그룹으로 옮겨 다시 마운트되기 때문.
 */
export function InboxPanel() {
  const { todos, backlogItems: items } = useTodos();
  const { projects, areas, resources } = useContainers();
  const actions = useTodoActions();
  const { inboxOpen, setInboxOpen, focusRequest } = useShellUI();
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG, data: { type: "inbox" } satisfies DropTargetData });
  const panelRef = useRef<HTMLElement>(null);
  const handledFocusRequest = useRef(0);
  const groups = useMemo(() => groupInboxItems(items, projects, areas, resources), [items, projects, areas, resources]);
  const { expanded, setExpanded } = useInboxExpanded();
  const dropGroupKey = useDropGroupKey(todos);
  const [detailTodoId, setDetailTodoId] = useState<string | null>(null);
  const closeDetail = useCallback(() => setDetailTodoId(null), []);

  function addToInbox(...args: Parameters<typeof actions.addToInbox>) {
    // 새 항목은 미분류에 들어간다 — 접혀 있으면 방금 쓴 게 안 보이니 펼친다
    setExpanded(UNSORTED_GROUP_KEY, true);
    actions.addToInbox(...args);
  }

  // 캘린더 툴바의 "+"로 열었을 때만 입력창에 포커스 (레일로 열 때는 포커스하지 않음 — 모바일 키보드 방지)
  useEffect(() => {
    if (!inboxOpen || focusRequest === handledFocusRequest.current) return;
    handledFocusRequest.current = focusRequest;
    panelRef.current?.querySelector<HTMLInputElement>("[data-add-input]")?.focus();
  }, [focusRequest, inboxOpen]);

  if (!inboxOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 sm:hidden" onClick={() => setInboxOpen(false)} aria-hidden="true" />
      <aside
        ref={panelRef}
        aria-label="Inbox"
        className={cn(
          "fixed bottom-[var(--tabbar-h)] left-0 right-0 z-40 flex h-[62vh] flex-col rounded-t-xl border border-border bg-panel shadow-lg",
          "sm:sticky sm:top-0 sm:bottom-auto sm:right-auto sm:z-auto sm:h-screen sm:w-[320px] sm:shrink-0 sm:rounded-none sm:border-0 sm:border-r sm:shadow-none"
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
            <SidebarSimple className="size-[18px]" />
          </button>
        </div>
        <p className="px-5 pb-3.5 text-[12.5px] text-muted-foreground">날짜 없는 할 일 · 분류 안 된 노트</p>

        <div className="mx-3 mb-1.5">
          <AddTodoForm onAdd={addToInbox} />
        </div>

        <div
          ref={setNodeRef}
          className={cn("min-h-0 flex-1 overflow-y-auto pt-1 transition-colors", isOver && "bg-accent/40")}
        >
          {groups.map((group) => {
            const open = expanded.has(group.key);
            return (
              <InboxGroupSection
                key={group.key}
                group={group}
                open={open}
                dropping={dropGroupKey === group.key}
                onToggle={() => setExpanded(group.key, !open)}
              >
                {group.items.map((todo) => (
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
                    onOpenDetail={setDetailTodoId}
                  />
                ))}
              </InboxGroupSection>
            );
          })}
          {items.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">Inbox가 비어 있어요</p>
          ) : null}
        </div>

        <p className="hidden border-t border-border px-5 pb-4 pt-3 text-[12px] text-muted-foreground sm:block">
          캘린더 · PARA 카드로 끌어다 놓아 배치 / 분류
        </p>
      </aside>
      {detailTodoId ? <TodoDetailById todoId={detailTodoId} onClose={closeDetail} /> : null}
    </>
  );
}

/** 다른 그룹 카드는 비키지 않는다(다른 그룹에 놓으면 맨 끝으로 가니까) — 같은 그룹 안에서만 순서 미리보기 */
const groupSortingStrategy: SortingStrategy = (args) =>
  args.activeIndex === -1 || args.overIndex === -1 ? null : verticalListSortingStrategy(args);

/**
 * 끌고 있는 카드를 놓으면 옮겨 갈 Inbox 그룹 key — 지금 그룹과 다를 때만. Inbox · PARA 상세 카드만
 * (캘린더 블록은 PARA를 바꾸지 않는다, handle-drop.ts).
 */
function useDropGroupKey(todos: Todo[]) {
  const [dropKey, setDropKey] = useState<string | null>(null);

  function update(event: DragOverEvent) {
    const activeData = event.active.data.current as ActiveData | undefined;
    const overData = event.over?.data.current as OverData | undefined;
    const activeTodo =
      activeData?.type === "todo" && activeData.source !== "calendar"
        ? todos.find((t) => t.id === String(event.active.id))
        : undefined;
    let key: string | null = null;
    if (overData?.type === "inbox-group") key = inboxGroupKey(mappingOfGroup(overData.kind, overData.id));
    else if (overData?.type === "todo" && overData.source === "inbox") {
      const overTodo = todos.find((t) => t.id === String(event.over?.id));
      if (overTodo) key = inboxGroupKey(overTodo);
    }
    setDropKey(activeTodo && key !== inboxGroupKey(activeTodo) ? key : null);
  }

  useDndMonitor({
    onDragOver: update,
    onDragEnd: () => setDropKey(null),
    onDragCancel: () => setDropKey(null),
  });
  return dropKey;
}

/** PARA 그룹 하나 — 머리(접기 · 개수) + 카드들. 그룹 전체가 드롭 대상(놓으면 그 PARA로). */
function InboxGroupSection({
  group,
  open,
  dropping,
  onToggle,
  children,
}: {
  group: InboxGroup;
  open: boolean;
  /** 끌고 있는 카드를 여기 놓으면 이 그룹으로 옮겨진다 */
  dropping: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `inbox-group:${group.key}`,
    data: { type: "inbox-group", kind: group.kind, id: group.containerId } satisfies DropTargetData,
  });
  // 점 · 틴트 = 그 PARA의 영역(컨텍스트) 색. 미분류는 회색 빈 원
  const paraColor = useParaColor();
  const groupColor = group.kind && group.containerId ? paraColor.ofContainer(group.kind, group.containerId) : null;
  const color = groupColor?.color ?? null;

  return (
    <section
      ref={setNodeRef}
      aria-label={group.name}
      className={cn("mt-1.5", dropping && "pb-1.5", dropping && !group.kind && "bg-black/[0.04]")}
      style={dropping && groupColor ? { backgroundColor: groupColor.tint } : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-[34px] w-full items-center gap-2 pl-3.5 pr-4 text-left hover:bg-black/[0.03]"
      >
        <CaretDown
          weight="bold"
          className={cn("size-3 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
        />
        {color ? (
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        ) : (
          <span className="size-2 shrink-0 rounded-full border-[1.5px] border-muted-foreground" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{group.name}</span>
        {dropping ? (
          // 영역 색을 살짝 어둡게 — 틴트 위 작은 글씨라 대비(DESIGN.md 3번)
          <span
            className="shrink-0 text-[12.5px] font-semibold"
            style={color ? { color: `color-mix(in srgb, ${color} 75%, black)` } : undefined}
          >
            여기로 옮기기
          </span>
        ) : (
          <span className="shrink-0 text-[12.5px] tabular-nums text-muted-foreground">{group.items.length}</span>
        )}
      </button>
      {open ? (
        <SortableContext id={group.key} items={group.items.map((t) => t.id)} strategy={groupSortingStrategy}>
          {children}
        </SortableContext>
      ) : null}
      {open && dropping ? (
        <div
          className="ml-[52px] mr-4 h-0.5 rounded-full"
          style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
          aria-hidden="true"
        />
      ) : null}
    </section>
  );
}

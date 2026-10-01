import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";

import { nextPosition, type useTodos } from "@/lib/app-data/use-todos";
import { DEFAULT_DURATION_MINUTES, HOUR_HEIGHT, MINUTES_PER_DAY, clampMinutes, snapMinutes } from "@/lib/time";
import type { ActiveData, DraggedTodoData, OverData } from "@/lib/dnd/drop-targets";
import { inboxGroupKey, mappingOfGroup } from "@/lib/inbox-groups";
import type { Subtask, Todo } from "@/lib/types";

type DropContext = Pick<
  ReturnType<typeof useTodos>,
  "todos" | "backlogItems" | "updateTodo" | "setTodos" | "persistPositions"
> & {
  subtasksOf: (todoId: string) => Subtask[];
  reorderSubtasks: (todoId: string, orderedIds: string[]) => void;
  /** 할 일을 주간 목표에 연결 — PARA가 비어 있으면 목표의 PARA를 채운다(`useGoalActions().link`) */
  linkToGoal: (goalId: string, todoIds: string[]) => void;
};

/**
 * 앱 전체의 드롭 처리 단일 구현 (REFACTORING-PLAN.md 3단계).
 * 드롭 대상은 `over.data`(DropTargetData)로, 끌고 있는 항목의 출처는 `active.data`(DraggedTodoData)로 판단한다.
 */
export function handleDrop(event: DragEndEvent, ctx: DropContext) {
  const { active, over } = event;
  if (!over) return;

  // 하위 할 일 → 같은 할 일 안에서 순서 변경만 (다른 대상은 collision.ts에서 이미 제외됨)
  const activeData = active.data.current as ActiveData | undefined;
  if (activeData?.type === "subtask") {
    const overData = over.data.current as OverData | undefined;
    if (overData?.type !== "subtask" || overData.todoId !== activeData.todoId) return;
    const list = ctx.subtasksOf(activeData.todoId);
    const oldIndex = list.findIndex((s) => s.id === String(active.id));
    const newIndex = list.findIndex((s) => s.id === String(over.id));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    ctx.reorderSubtasks(
      activeData.todoId,
      arrayMove(list, oldIndex, newIndex).map((s) => s.id)
    );
    return;
  }

  const todo = ctx.todos.find((t) => t.id === String(active.id));
  if (!todo) return;

  const source = (active.data.current as DraggedTodoData | undefined)?.source ?? "inbox";
  const target = over.data.current as OverData | undefined;
  if (!target) return;

  // 캘린더 하루 칸 → 그 날짜 · 놓은 위치의 시간(15분 스냅)으로 배치
  if (target.type === "calendar-day") {
    const duration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const gridTop = over.rect.top;
    const itemTop = active.rect.current.translated?.top ?? gridTop;
    const rawMinutes = ((itemTop - gridTop) / HOUR_HEIGHT) * 60;
    const startMinutes = clampMinutes(snapMinutes(rawMinutes), 0, MINUTES_PER_DAY - duration);
    void ctx.updateTodo(todo.id, { scheduledDate: target.date, startMinutes, durationMinutes: duration });
    return;
  }

  // 주간 목표 카드 → 그 목표에 연결 (노트는 목표에 넣지 않는다)
  if (target.type === "goal") {
    if (todo.kind === "task") ctx.linkToGoal(target.id, [todo.id]);
    return;
  }

  // PARA 카드 · PARA 상세 화면 → 그 컨테이너로 매핑
  if (target.type === "para-container") {
    void ctx.updateTodo(todo.id, {
      projectId: target.kind === "project" ? target.id : null,
      areaId: target.kind === "area" ? target.id : null,
      resourceId: target.kind === "resource" ? target.id : null,
    });
    return;
  }

  // PARA 상세 화면 목록의 다른 카드 위 → 그 카드와 같은 컨테이너로 매핑
  if (target.type === "todo" && target.source === "container") {
    const overTodo = ctx.todos.find((t) => t.id === String(over.id));
    if (!overTodo || overTodo.id === todo.id) return;
    void ctx.updateTodo(todo.id, {
      projectId: overTodo.projectId,
      areaId: overTodo.areaId,
      resourceId: overTodo.resourceId,
    });
    return;
  }

  // Inbox의 PARA 그룹(머리 또는 그 그룹의 카드) → 그 PARA로 매핑하고 Inbox 맨 끝(= 그 그룹 맨 끝)으로
  // (INBOX-GROUPS-PLAN.md). 캘린더 블록은 제외 — 날짜만 빼고 PARA는 그대로 둔다(아래).
  if (source !== "calendar") {
    const groupMapping = inboxGroupMappingOf(target, String(over.id), ctx.todos);
    if (groupMapping) {
      if (inboxGroupKey(groupMapping) !== inboxGroupKey(todo)) {
        void ctx.updateTodo(todo.id, { ...groupMapping, position: nextPosition(ctx.backlogItems) });
        return;
      }
      // PARA 상세 카드를 이미 속한 그룹에 놓음 → 그대로. Inbox 카드는 아래에서 순서 변경
      if (source === "container") return;
    }
  }

  const droppedOnInbox =
    target.type === "inbox" || target.type === "inbox-group" || (target.type === "todo" && target.source === "inbox");
  if (!droppedOnInbox) return;

  // 캘린더 블록 → Inbox: 날짜 배치 해제, Inbox 맨 끝으로
  if (source === "calendar") {
    void ctx.updateTodo(todo.id, {
      scheduledDate: null,
      startMinutes: null,
      durationMinutes: null,
      position: nextPosition(ctx.backlogItems),
    });
    return;
  }

  // PARA 상세 목록의 카드 → Inbox 빈 곳: 매핑 해제(미분류로)
  if (source === "container") {
    void ctx.updateTodo(todo.id, { projectId: null, areaId: null, resourceId: null });
    return;
  }

  // Inbox 안에서 끌기: 순서 변경
  const oldIndex = ctx.backlogItems.findIndex((t) => t.id === todo.id);
  const overIndex = ctx.backlogItems.findIndex((t) => t.id === String(over.id));
  const ordered =
    oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
      ? arrayMove(ctx.backlogItems, oldIndex, overIndex)
      : ctx.backlogItems;

  const positionById = new Map(ordered.map((t, index) => [t.id, index]));
  ctx.setTodos((prev) => prev.map((t) => (positionById.has(t.id) ? { ...t, position: positionById.get(t.id)! } : t)));
  void ctx.persistPositions(ordered.map((t) => ({ id: t.id, position: positionById.get(t.id)! })));
}

/** 드롭 대상이 Inbox의 어느 PARA 그룹인지 — 그 그룹의 매핑. Inbox 그룹이 아니면 null. */
function inboxGroupMappingOf(target: OverData, overId: string, todos: Todo[]) {
  if (target.type === "inbox-group") return mappingOfGroup(target.kind, target.id);
  if (target.type === "todo" && target.source === "inbox") {
    const overTodo = todos.find((t) => t.id === overId);
    if (overTodo) return { projectId: overTodo.projectId, areaId: overTodo.areaId, resourceId: overTodo.resourceId };
  }
  return null;
}

"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useSubtaskActions } from "@/lib/app-data/subtask-actions";
import { preferSpecificTargetCollision } from "@/lib/dnd/collision";
import { handleDrop } from "@/lib/dnd/handle-drop";
import { useGoalActions } from "@/lib/app-data/goal-actions";
import type { ActiveData, DraggedTodoData } from "@/lib/dnd/drop-targets";
import { TodoCard } from "@/components/todo-card";
import { CalendarBlock } from "@/components/calendar-block";
import { SubtaskDragPreview } from "@/components/subtask/subtask-list";

/**
 * 앱 전체에 하나뿐인 드래그 앤 드롭 컨텍스트. `(app)/layout.tsx`에서 한 번만 마운트된다.
 * 예전엔 캘린더 · PARA 목록 · PARA 상세 화면이 각자 DndContext · sensors · DragOverlay ·
 * handleDragEnd를 들고 있었다.
 */
export function DndProvider({ children }: { children: ReactNode }) {
  const { todos, backlogItems, updateTodo, setTodos, persistPositions } = useTodos();
  const { subtasks, subtasksOf } = useSubtasks();
  const subtaskActions = useSubtaskActions();
  const goalActions = useGoalActions();
  const [active, setActive] = useState<
    { kind: "todo"; id: string; source: DraggedTodoData["source"] } | { kind: "subtask"; id: string } | null
  >(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as ActiveData | undefined;
    const id = String(event.active.id);
    if (data?.type === "subtask") setActive({ kind: "subtask", id });
    else setActive({ kind: "todo", id, source: data?.source ?? "inbox" });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    handleDrop(event, {
      todos,
      backlogItems,
      updateTodo,
      setTodos,
      persistPositions,
      subtasksOf,
      reorderSubtasks: subtaskActions.reorder,
      linkToGoal: goalActions.link,
    });
  }

  const activeTodo = active?.kind === "todo" ? (todos.find((t) => t.id === active.id) ?? null) : null;
  const activeSubtask = active?.kind === "subtask" ? (subtasks.find((s) => s.id === active.id) ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={preferSpecificTargetCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay>
        {activeTodo ? (
          active?.kind === "todo" && active.source === "calendar" ? (
            <CalendarBlock todo={activeTodo} overlay />
          ) : (
            <TodoCard todo={activeTodo} overlay />
          )
        ) : activeSubtask ? (
          <SubtaskDragPreview subtask={activeSubtask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

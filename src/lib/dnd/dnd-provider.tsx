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
import { preferSpecificTargetCollision } from "@/lib/dnd/collision";
import { handleDrop } from "@/lib/dnd/handle-drop";
import type { DraggedTodoData } from "@/lib/dnd/drop-targets";
import { TodoCard } from "@/components/todo-card";
import { CalendarBlock } from "@/components/calendar-block";

/**
 * 앱 전체에 하나뿐인 드래그 앤 드롭 컨텍스트. `(app)/layout.tsx`에서 한 번만 마운트된다.
 * 예전엔 캘린더 · PARA 목록 · PARA 상세 화면이 각자 DndContext · sensors · DragOverlay ·
 * handleDragEnd를 들고 있었다.
 */
export function DndProvider({ children }: { children: ReactNode }) {
  const { todos, backlogItems, updateTodo, setTodos, persistPositions } = useTodos();
  const [active, setActive] = useState<{ id: string; source: DraggedTodoData["source"] } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragStart(event: DragStartEvent) {
    const source = (event.active.data.current as DraggedTodoData | undefined)?.source ?? "inbox";
    setActive({ id: String(event.active.id), source });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    handleDrop(event, { todos, backlogItems, updateTodo, setTodos, persistPositions });
  }

  const activeTodo = active ? (todos.find((t) => t.id === active.id) ?? null) : null;

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
          active?.source === "calendar" ? (
            <CalendarBlock todo={activeTodo} overlay />
          ) : (
            <TodoCard todo={activeTodo} overlay />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

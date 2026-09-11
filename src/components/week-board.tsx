"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { useLocalTodos } from "@/lib/storage";
import { mondayOf, shiftWeeks, toDateKey, weekNumberLabel, weekRangeLabel } from "@/lib/week";
import { BACKLOG, DAY_KEYS, DAY_LABELS, type ColumnKey, type Todo } from "@/lib/types";
import { TodoColumn } from "@/components/todo-column";
import { TodoCard } from "@/components/todo-card";
import { WeekNav } from "@/components/week-nav";

function nextPosition(items: Todo[]) {
  return items.length === 0 ? 0 : Math.max(...items.map((t) => t.position)) + 1;
}

export function WeekBoard() {
  const [todos, setTodos] = useLocalTodos();
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);

  const weekKey = toDateKey(monday);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const itemsByColumn = useMemo(() => {
    const grouped: Record<ColumnKey, Todo[]> = {
      backlog: [],
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    };
    for (const todo of todos) {
      if (todo.day === null) {
        grouped.backlog.push(todo);
      } else if (todo.weekStart === weekKey) {
        grouped[todo.day].push(todo);
      }
    }
    (Object.keys(grouped) as ColumnKey[]).forEach((key) => {
      grouped[key].sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [todos, weekKey]);

  function columnOf(id: string): ColumnKey | undefined {
    if (id === BACKLOG || (DAY_KEYS as string[]).includes(id)) {
      return id as ColumnKey;
    }
    const todo = todos.find((t) => t.id === id);
    if (!todo) return undefined;
    return todo.day === null ? BACKLOG : todo.day;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const fromColumn = columnOf(activeIdStr);
    const toColumn = columnOf(overIdStr);
    if (!fromColumn || !toColumn || fromColumn === toColumn) return;

    setTodos((prev) => {
      const activeTodo = prev.find((t) => t.id === activeIdStr);
      if (!activeTodo) return prev;
      const destItems = itemsByColumn[toColumn];
      const overIndex = destItems.findIndex((t) => t.id === overIdStr);
      const newPosition =
        overIndex === -1 ? nextPosition(destItems) : destItems[overIndex].position - 0.5;
      return prev.map((t) =>
        t.id === activeIdStr
          ? {
              ...t,
              day: toColumn === BACKLOG ? null : toColumn,
              weekStart: toColumn === BACKLOG ? null : weekKey,
              position: newPosition,
            }
          : t
      );
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const column = columnOf(activeIdStr);
    if (!column) return;

    setTodos((prev) => {
      const columnItems = prev
        .filter((t) =>
          column === BACKLOG ? t.day === null : t.day === column && t.weekStart === weekKey
        )
        .sort((a, b) => a.position - b.position);

      const oldIndex = columnItems.findIndex((t) => t.id === activeIdStr);
      const overIndex = columnItems.findIndex((t) => t.id === overIdStr);
      const ordered =
        oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
          ? arrayMove(columnItems, oldIndex, overIndex)
          : columnItems;

      const normalized = new Map(ordered.map((t, index) => [t.id, index]));
      return prev.map((t) => (normalized.has(t.id) ? { ...t, position: normalized.get(t.id)! } : t));
    });
  }

  function addTodo(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    setTodos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        content: trimmed,
        day: null,
        weekStart: null,
        completed: false,
        position: nextPosition(itemsByColumn.backlog),
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function toggleCompleted(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function removeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function updateContent(id: string, content: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
  }

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) ?? null : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">주간 Todo Planner</h1>
        <WeekNav
          label={weekNumberLabel(monday)}
          rangeLabel={weekRangeLabel(monday)}
          onPrev={() => setMonday((m) => shiftWeeks(m, -1))}
          onNext={() => setMonday((m) => shiftWeeks(m, 1))}
          onToday={() => setMonday(mondayOf(new Date()))}
        />
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-[minmax(220px,1.4fr)_repeat(7,minmax(160px,1fr))] gap-3 overflow-x-auto pb-2">
          <SortableContext
            items={itemsByColumn.backlog.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <TodoColumn
              id={BACKLOG}
              title="Todo List"
              items={itemsByColumn.backlog}
              onToggle={toggleCompleted}
              onRemove={removeTodo}
              onEdit={updateContent}
              onAdd={addTodo}
            />
          </SortableContext>
          {DAY_KEYS.map((day) => (
            <SortableContext
              key={day}
              items={itemsByColumn[day].map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <TodoColumn
                id={day}
                title={DAY_LABELS[day]}
                items={itemsByColumn[day]}
                onToggle={toggleCompleted}
                onRemove={removeTodo}
                onEdit={updateContent}
              />
            </SortableContext>
          ))}
        </div>
        <DragOverlay>{activeTodo ? <TodoCard todo={activeTodo} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

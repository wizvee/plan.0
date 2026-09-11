"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Check } from "lucide-react";

import { useSupabaseTodos } from "@/lib/supabase/todos";
import { createClient } from "@/lib/supabase/client";
import {
  dayDateKey,
  isToday as isTodayKey,
  mondayOf,
  shiftWeeks,
  toDateKey,
  weekNumberLabel,
  weekRangeLabel,
} from "@/lib/week";
import { cn } from "@/lib/utils";
import { BACKLOG, DAY_KEYS, DAY_LABELS, DAY_LABELS_KO, type DayKey, type ColumnKey, type Todo } from "@/lib/types";
import { TodoColumn } from "@/components/todo-column";
import { TodoCard } from "@/components/todo-card";
import { TodoPanel } from "@/components/todo-panel";
import { IconRail } from "@/components/icon-rail";
import { WeekNav } from "@/components/week-nav";
import { Button } from "@/components/ui/button";

function nextPosition(items: Todo[]) {
  return items.length === 0 ? 0 : Math.max(...items.map((t) => t.position)) + 1;
}

interface WeekBoardProps {
  userId: string;
  userEmail: string;
}

export function WeekBoard({ userId, userEmail }: WeekBoardProps) {
  const router = useRouter();
  const { todos, setTodos, addTodo, updateTodo, removeTodo, persistPositions } =
    useSupabaseTodos(userId);
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileDay, setMobileDay] = useState<DayKey>("mon");
  const [panelOpen, setPanelOpen] = useState(false);

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

    const columnItems = itemsByColumn[column];
    const oldIndex = columnItems.findIndex((t) => t.id === activeIdStr);
    const overIndex = columnItems.findIndex((t) => t.id === overIdStr);
    const ordered =
      oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
        ? arrayMove(columnItems, oldIndex, overIndex)
        : columnItems;

    const normalizedById = new Map(ordered.map((t, index) => [t.id, index]));
    setTodos((prev) =>
      prev.map((t) => (normalizedById.has(t.id) ? { ...t, position: normalizedById.get(t.id)! } : t))
    );

    void persistPositions(
      ordered.map((t) => ({
        id: t.id,
        day: t.day,
        weekStart: t.weekStart,
        position: normalizedById.get(t.id)!,
      }))
    );
  }

  function handleAdd(content: string) {
    void addTodo(content, nextPosition(itemsByColumn.backlog));
  }

  function handleToggle(id: string) {
    const current = todos.find((t) => t.id === id);
    if (!current) return;
    void updateTodo(id, { completed: !current.completed });
  }

  function handleRemove(id: string) {
    void removeTodo(id);
  }

  function handleEdit(id: string, content: string) {
    void updateTodo(id, { content });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) ?? null : null;

  return (
    <div className="min-h-screen pr-14">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <h1 className="text-[34px] font-bold leading-none tracking-tight">
                {weekNumberLabel(monday)}
              </h1>
              <p className="mt-1.5 text-[15px] text-muted-foreground">{weekRangeLabel(monday)}</p>
            </div>
            <div className="flex items-center gap-4">
              <WeekNav
                onPrev={() => setMonday((m) => shiftWeeks(m, -1))}
                onNext={() => setMonday((m) => shiftWeeks(m, 1))}
                onToday={() => setMonday(mondayOf(new Date()))}
              />
              <div className="flex items-center gap-2 border-l border-border pl-4">
                <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[15px] font-medium text-muted-foreground hover:bg-accent"
                  onClick={handleSignOut}
                >
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
            {DAY_KEYS.map((day) => (
              <Button
                key={day}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3.5",
                  mobileDay === day
                    ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
                onClick={() => setMobileDay(day)}
              >
                {DAY_LABELS_KO[day]}
              </Button>
            ))}
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
            {DAY_KEYS.map((day, index) => (
              <SortableContext
                key={day}
                items={itemsByColumn[day].map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <TodoColumn
                  id={day}
                  title={DAY_LABELS[day]}
                  items={itemsByColumn[day]}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                  onEdit={handleEdit}
                  isToday={isTodayKey(dayDateKey(monday, index))}
                  className={cn(mobileDay !== day && "hidden", "sm:block")}
                />
              </SortableContext>
            ))}
          </div>

          {panelOpen ? (
            <SortableContext
              items={itemsByColumn.backlog.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <TodoPanel
                items={itemsByColumn.backlog}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onEdit={handleEdit}
                onAdd={handleAdd}
                onClose={() => setPanelOpen(false)}
              />
            </SortableContext>
          ) : null}

          <DragOverlay>{activeTodo ? <TodoCard todo={activeTodo} overlay /> : null}</DragOverlay>
        </DndContext>
      </div>

      <IconRail
        items={[
          {
            icon: Check,
            label: "Todo List",
            active: panelOpen,
            onClick: () => setPanelOpen((open) => !open),
          },
        ]}
      />
    </div>
  );
}

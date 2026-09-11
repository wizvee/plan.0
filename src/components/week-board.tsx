"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Check } from "lucide-react";

import { useSupabaseTodos } from "@/lib/supabase/todos";
import { createClient } from "@/lib/supabase/client";
import { mondayOf, shiftWeeks, toDateKey, weekNumberLabel, weekRangeLabel } from "@/lib/week";
import { cn } from "@/lib/utils";
import { BACKLOG, DAY_KEYS, DAY_LABELS_KO, type DayKey, type Todo } from "@/lib/types";
import { DEFAULT_DURATION_MINUTES, HOUR_HEIGHT, MINUTES_PER_DAY, clampMinutes, snapMinutes } from "@/lib/time";
import { TodoCard } from "@/components/todo-card";
import { CalendarBlock } from "@/components/calendar-block";
import { WeekCalendar } from "@/components/week-calendar";
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

  const backlogItems = useMemo(
    () => todos.filter((t) => t.day === null).sort((a, b) => a.position - b.position),
    [todos]
  );

  const scheduledByDay = useMemo(() => {
    const grouped: Record<DayKey, Todo[]> = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
    for (const todo of todos) {
      if (todo.day !== null && todo.weekStart === weekKey) {
        grouped[todo.day].push(todo);
      }
    }
    return grouped;
  }, [todos, weekKey]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const todo = todos.find((t) => t.id === activeIdStr);
    if (!todo) return;

    if (overIdStr.startsWith("grid:")) {
      const day = overIdStr.slice("grid:".length) as DayKey;
      const duration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
      const gridTop = over.rect.top;
      const itemTop = active.rect.current.translated?.top ?? gridTop;
      const rawMinutes = ((itemTop - gridTop) / HOUR_HEIGHT) * 60;
      const startMinutes = clampMinutes(snapMinutes(rawMinutes), 0, MINUTES_PER_DAY - duration);
      const patch = { day, weekStart: weekKey, startMinutes, durationMinutes: duration };
      setTodos((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, ...patch } : t)));
      void updateTodo(activeIdStr, patch);
      return;
    }

    const isOverBacklogItem = todos.some((t) => t.id === overIdStr && t.day === null);
    if (overIdStr !== BACKLOG && !isOverBacklogItem) return;

    if (todo.day !== null) {
      const patch = {
        day: null,
        weekStart: null,
        startMinutes: null,
        durationMinutes: null,
        position: nextPosition(backlogItems),
      };
      setTodos((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, ...patch } : t)));
      void updateTodo(activeIdStr, patch);
      return;
    }

    const oldIndex = backlogItems.findIndex((t) => t.id === activeIdStr);
    const overIndex = backlogItems.findIndex((t) => t.id === overIdStr);
    const ordered =
      oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
        ? arrayMove(backlogItems, oldIndex, overIndex)
        : backlogItems;

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
    void addTodo(content, nextPosition(backlogItems));
  }

  function handleResize(id: string, durationMinutes: number) {
    void updateTodo(id, { durationMinutes });
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
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <WeekCalendar
            monday={monday}
            mobileDay={mobileDay}
            itemsByDay={scheduledByDay}
            onToggle={handleToggle}
            onRemove={handleRemove}
            onEdit={handleEdit}
            onResize={handleResize}
          />

          {panelOpen ? (
            <SortableContext items={backlogItems.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <TodoPanel
                items={backlogItems}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onEdit={handleEdit}
                onAdd={handleAdd}
                onClose={() => setPanelOpen(false)}
              />
            </SortableContext>
          ) : null}

          <DragOverlay>
            {activeTodo ? (
              activeTodo.day === null ? (
                <TodoCard todo={activeTodo} overlay />
              ) : (
                <CalendarBlock todo={activeTodo} overlay />
              )
            ) : null}
          </DragOverlay>
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

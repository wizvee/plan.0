"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, format, startOfMonth, subMonths } from "date-fns";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { useSupabaseTodos } from "@/lib/supabase/todos";
import { useSupabaseAreas, useSupabaseProjects, useSupabaseResources } from "@/lib/supabase/containers";
import { createClient } from "@/lib/supabase/client";
import {
  dayDateKey,
  dayKeyOf,
  mondayOf,
  parseDateKey,
  shiftWeeks,
  toDateKey,
  weekNumberLabel,
  weekRangeLabel,
} from "@/lib/week";
import { preferSpecificTargetCollision } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { useTodayKey } from "@/lib/use-today";
import { BACKLOG, DAY_KEYS, DAY_LABELS_KO, isInboxVisible, type DayKey, type Todo, type TodoKind } from "@/lib/types";
import { DEFAULT_DURATION_MINUTES, HOUR_HEIGHT, MINUTES_PER_DAY, clampMinutes, snapMinutes } from "@/lib/time";
import { TodoCard } from "@/components/todo-card";
import { CalendarBlock } from "@/components/calendar-block";
import { WeekCalendar } from "@/components/week-calendar";
import { MonthCalendar } from "@/components/month-calendar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppNavRail } from "@/components/app-nav-rail";
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
  const searchParams = useSearchParams();
  const { todos, setTodos, addTodo, addNote, updateTodo, removeTodo, persistPositions } =
    useSupabaseTodos(userId);
  const { projects } = useSupabaseProjects(userId);
  const { areas } = useSupabaseAreas(userId);
  const { resources } = useSupabaseResources(userId);
  // URL이 화면 상태의 유일한 출처다 — monday/viewMode/displayMonth를 별도 state로 들고 있다가
  // router.replace로 동기화하는 대신, 매 렌더마다 searchParams에서 직접 계산한다. 이렇게 해야
  // AppSidebar처럼 다른 컴포넌트가 URL만 바꿔도(같은 라우트에 있어도) 화면이 바로 반응한다.
  const weekParam = searchParams.get("week");
  const monday = useMemo(() => mondayOf(parseDateKey(weekParam) ?? new Date()), [weekParam]);
  const viewMode: "week" | "month" = searchParams.get("view") === "month" ? "month" : "week";
  const monthParam = searchParams.get("month");
  const displayMonth = useMemo(() => startOfMonth(parseDateKey(monthParam) ?? monday), [monthParam, monday]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileDay, setMobileDay] = useState<DayKey>("mon");
  const [panelOpen, setPanelOpen] = useState(false);

  const weekKey = toDateKey(monday);
  const todayKey = useTodayKey();

  function goToWeek(date: Date) {
    router.replace(`/?week=${toDateKey(mondayOf(date))}`, { scroll: false });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const backlogItems = useMemo(
    () => todos.filter(isInboxVisible).sort((a, b) => a.position - b.position),
    [todos]
  );

  const scheduledByDay = useMemo(() => {
    const grouped: Record<DayKey, Todo[]> = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
    const weekEndKey = toDateKey(addDays(monday, 6));
    for (const todo of todos) {
      if (todo.scheduledDate !== null && todo.scheduledDate >= weekKey && todo.scheduledDate <= weekEndKey) {
        grouped[dayKeyOf(new Date(`${todo.scheduledDate}T00:00:00`))].push(todo);
      }
    }
    return grouped;
  }, [todos, weekKey, monday]);

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
      const scheduledDate = dayDateKey(monday, DAY_KEYS.indexOf(day));
      const patch = { scheduledDate, startMinutes, durationMinutes: duration };
      setTodos((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, ...patch } : t)));
      void updateTodo(activeIdStr, patch);
      return;
    }

    const isOverBacklogItem = todos.some((t) => t.id === overIdStr && isInboxVisible(t));
    if (overIdStr !== BACKLOG && !isOverBacklogItem) return;

    if (todo.scheduledDate !== null) {
      const patch = {
        scheduledDate: null,
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
      ordered.map((t) => ({ id: t.id, position: normalizedById.get(t.id)! }))
    );
  }

  function handleAdd(content: string, kind: TodoKind) {
    if (kind === "note") void addNote(content, nextPosition(backlogItems));
    else void addTodo(content, nextPosition(backlogItems));
  }

  function handleConvert(id: string, kind: TodoKind) {
    if (kind === "note") {
      void updateTodo(id, {
        kind,
        scheduledDate: null,
        startMinutes: null,
        durationMinutes: null,
        completed: false,
      });
    } else {
      void updateTodo(id, { kind });
    }
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

  function handleMemoEdit(id: string, memo: string) {
    void updateTodo(id, { memo: memo || null });
  }

  function handleUrlEdit(id: string, url: string | null) {
    void updateTodo(id, { url });
  }

  function handleAssignPara(
    id: string,
    patch: { projectId: string | null; areaId: string | null; resourceId: string | null }
  ) {
    void updateTodo(id, patch);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) ?? null : null;

  return (
    <div className="min-h-screen pb-14 sm:pb-0 sm:pl-[260px]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6 sm:px-6">
        {viewMode === "week" ? (
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div className="hidden sm:block">
                <h1 className="text-[34px] font-bold leading-none tracking-tight">
                  {weekNumberLabel(monday)}
                </h1>
                <p className="mt-1.5 text-[15px] text-muted-foreground">{weekRangeLabel(monday)}</p>
              </div>
              <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
                <WeekNav
                  onPrev={() => router.replace(`/?week=${toDateKey(shiftWeeks(monday, -1))}`, { scroll: false })}
                  onNext={() => router.replace(`/?week=${toDateKey(shiftWeeks(monday, 1))}`, { scroll: false })}
                  onToday={() => router.replace(`/?week=${toDateKey(mondayOf(new Date()))}`, { scroll: false })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[15px] font-medium text-muted-foreground hover:bg-accent sm:hidden"
                  onClick={handleSignOut}
                >
                  로그아웃
                </Button>
              </div>
            </div>
            <div className="sm:hidden">
              <div className="flex items-center justify-between">
                {DAY_KEYS.map((day, index) => {
                  const date = addDays(monday, index);
                  const isToday = toDateKey(date) === todayKey;
                  const isSelected = mobileDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setMobileDay(day)}
                      className="flex flex-col items-center gap-1.5 py-1"
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {DAY_LABELS_KO[day]}
                      </span>
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full text-[15px] font-semibold transition-colors",
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : isSelected
                              ? "ring-2 ring-primary text-foreground"
                              : "text-foreground"
                        )}
                      >
                        {format(date, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2.5 border-t border-border/70 pt-2.5 text-center text-[13px] text-muted-foreground">
                {weekNumberLabel(monday)} · {format(addDays(monday, DAY_KEYS.indexOf(mobileDay)), "yyyy년 M월 d일")}{" "}
                {DAY_LABELS_KO[mobileDay]}요일
              </div>
            </div>
          </header>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={preferSpecificTargetCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {viewMode === "week" ? (
            <WeekCalendar
              monday={monday}
              mobileDay={mobileDay}
              itemsByDay={scheduledByDay}
              projects={projects}
              areas={areas}
              resources={resources}
              onToggle={handleToggle}
              onRemove={handleRemove}
              onEdit={handleEdit}
              onMemoEdit={handleMemoEdit}
              onUrlEdit={handleUrlEdit}
              onAssignPara={handleAssignPara}
              onResize={handleResize}
            />
          ) : (
            <MonthCalendar
              displayMonth={displayMonth}
              todos={todos}
              projects={projects}
              areas={areas}
              resources={resources}
              todayKey={todayKey}
              onSelectDay={goToWeek}
              onPrevMonth={() =>
                router.replace(`/?view=month&month=${toDateKey(subMonths(displayMonth, 1))}`, { scroll: false })
              }
              onNextMonth={() =>
                router.replace(`/?view=month&month=${toDateKey(addMonths(displayMonth, 1))}`, { scroll: false })
              }
              onToday={() =>
                router.replace(`/?view=month&month=${toDateKey(startOfMonth(new Date()))}`, { scroll: false })
              }
              onEdit={handleEdit}
              onMemoEdit={handleMemoEdit}
              onUrlEdit={handleUrlEdit}
              onAssignPara={handleAssignPara}
              onRemove={handleRemove}
            />
          )}

          <SortableContext items={backlogItems.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <AppSidebar
              activePage="calendar"
              userEmail={userEmail}
              onSignOut={handleSignOut}
              panelOpen={panelOpen}
              onClosePanel={() => setPanelOpen(false)}
              items={backlogItems}
              projects={projects}
              areas={areas}
              resources={resources}
              onToggle={handleToggle}
              onRemove={handleRemove}
              onEdit={handleEdit}
              onMemoEdit={handleMemoEdit}
              onUrlEdit={handleUrlEdit}
              onAssignPara={handleAssignPara}
              onConvert={handleConvert}
              onAdd={handleAdd}
            />
          </SortableContext>

          <DragOverlay>
            {activeTodo ? (
              activeTodo.scheduledDate === null ? (
                <TodoCard todo={activeTodo} overlay />
              ) : (
                <CalendarBlock todo={activeTodo} overlay />
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AppNavRail activePage="calendar" panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((open) => !open)} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";

import { TodoDetailModal } from "@/components/todo-detail-modal";
import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, getParaCategory } from "@/lib/category";
import { formatClock } from "@/lib/time";
import { toDateKey } from "@/lib/week";
import { DAY_LABELS_KO, type Area, type Project, type Resource, type Todo } from "@/lib/types";
import { useSubtasks } from "@/lib/app-data/use-subtasks";

const WEEKDAY_ORDER: (keyof typeof DAY_LABELS_KO)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const MAX_VISIBLE_EVENTS = 2;

interface MonthCalendarProps {
  displayMonth: Date;
  todos: Todo[];
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  todayKey: string | null;
  onSelectDay: (date: Date) => void;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onUrlEdit: (id: string, url: string | null) => void;
  onAssignPara: (id: string, patch: { projectId: string | null; areaId: string | null; resourceId: string | null }) => void;
  onRemove: (id: string) => void;
}

export function MonthCalendar({
  displayMonth,
  todos,
  projects,
  areas,
  resources,
  todayKey,
  onSelectDay,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
  onRemove,
}: MonthCalendarProps) {
  const [detailTodoId, setDetailTodoId] = useState<string | null>(null);
  const { progressOf } = useSubtasks();
  const detailTodo = detailTodoId ? todos.find((t) => t.id === detailTodoId) ?? null : null;
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      if (!todo.scheduledDate) continue;
      const list = map.get(todo.scheduledDate);
      if (list) list.push(todo);
      else map.set(todo.scheduledDate, [todo]);
    }
    return map;
  }, [todos]);

  const gridStart = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="flex flex-col border-t border-border [--month-bottom:64px] sm:[--month-bottom:0px]">
      <div className="grid h-8 grid-cols-7 border-b border-border">
        {WEEKDAY_ORDER.map((day) => (
          <span key={day} className="flex items-center pl-2.5 text-[11.5px] font-medium text-muted-foreground">
            {DAY_LABELS_KO[day]}
          </span>
        ))}
      </div>

      <div
        className="grid grid-cols-7"
        style={{ gridAutoRows: `minmax(96px, calc((100dvh - 60px - 33px - var(--month-bottom, 0px)) / ${days.length / 7}))` }}
      >
        {days.map((date, index) => {
          const dateKey = toDateKey(date);
          const inMonth = isSameMonth(date, displayMonth);
          const isToday = dateKey === todayKey;
          const isWeekend = index % 7 >= 5;
          const events = eventsByDate.get(dateKey) ?? [];
          const visible = events.slice(0, MAX_VISIBLE_EVENTS);
          const moreCount = events.length - visible.length;
          const label = date.getDate() === 1 ? format(date, "M월 d일") : format(date, "d");

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              aria-label={`${format(date, "M월 d일")} 주 보기로`}
              onClick={() => onSelectDay(date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(date);
                }
              }}
              className={cn(
                "flex min-h-0 cursor-pointer flex-col gap-0.5 overflow-hidden border-b border-r border-black/[0.06] px-1.5 pb-1 pt-1.5 text-left hover:bg-black/[0.02]",
                isWeekend && "bg-black/[0.015]"
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1 text-[13px] font-medium",
                  !inMonth && "text-muted-foreground/50",
                  isToday && "bg-today font-semibold text-white"
                )}
              >
                {label}
              </span>
              {visible.map((todo) => {
                const category = getParaCategory(todo);
                const colorVar = category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)";
                const progress = todo.kind === "task" ? progressOf(todo.id) : null;
                return (
                  <button
                    key={todo.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailTodoId(todo.id);
                    }}
                    className={cn(
                      "flex h-5 w-full items-center gap-1.5 rounded px-1 text-left text-[12px] hover:bg-black/5",
                      todo.completed && "opacity-50"
                    )}
                  >
                    <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: colorVar }} aria-hidden="true" />
                    <span className={cn("min-w-0 flex-1 truncate", todo.completed && "line-through")}>
                      <InlineText text={todo.content} />
                    </span>
                    {progress && progress.total > 0 ? (
                      <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-muted-foreground">
                        {progress.done}/{progress.total}
                      </span>
                    ) : null}
                    {todo.startMinutes !== null ? (
                      <span className="hidden shrink-0 text-[11px] text-muted-foreground lg:inline">
                        {formatClock(todo.startMinutes)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {moreCount > 0 ? (
                <span className="pl-[17px] text-[11px] text-muted-foreground">+{moreCount}개 더보기</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {detailTodo ? (
        <TodoDetailModal
          todo={detailTodo}
          projects={projects}
          areas={areas}
          resources={resources}
          onEdit={onEdit}
          onMemoEdit={onMemoEdit}
          onUrlEdit={onUrlEdit}
          onAssignPara={onAssignPara}
          onRemove={onRemove}
          onClose={() => setDetailTodoId(null)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TodoDetailModal } from "@/components/todo-detail-modal";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, CATEGORY_TINT_VAR, getParaCategory } from "@/lib/category";
import { toDateKey } from "@/lib/week";
import { DAY_LABELS_KO, type Todo } from "@/lib/types";

const WEEKDAY_ORDER: (keyof typeof DAY_LABELS_KO)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const MAX_VISIBLE_EVENTS = 2;

interface MonthCalendarProps {
  displayMonth: Date;
  todos: Todo[];
  todayKey: string | null;
  onSelectDay: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onRemove: (id: string) => void;
}

export function MonthCalendar({
  displayMonth,
  todos,
  todayKey,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
  onEdit,
  onMemoEdit,
  onRemove,
}: MonthCalendarProps) {
  const [detailTodo, setDetailTodo] = useState<Todo | null>(null);
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-tight">{format(displayMonth, "yyyy년 M월")}</h1>
        <div className="flex items-center gap-2.5">
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="이전 달"
              className="flex h-[34px] w-[34px] items-center justify-center text-muted-foreground hover:bg-accent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="다음 달"
              className="flex h-[34px] w-[34px] items-center justify-center border-l border-border text-muted-foreground hover:bg-accent"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onToday}
            className="h-[34px] rounded-md border border-border px-3.5 text-[13px] font-semibold hover:bg-accent"
          >
            오늘
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_ORDER.map((day) => (
          <span
            key={day}
            className={cn(
              "pb-1 text-center text-[12px] font-bold text-muted-foreground",
              (day === "sat" || day === "sun") && "text-destructive/80"
            )}
          >
            {DAY_LABELS_KO[day]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const inMonth = isSameMonth(date, displayMonth);
          const isToday = dateKey === todayKey;
          const events = eventsByDate.get(dateKey) ?? [];
          const visible = events.slice(0, MAX_VISIBLE_EVENTS);
          const moreCount = events.length - visible.length;

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(date);
                }
              }}
              className={cn(
                "flex min-h-[104px] cursor-pointer flex-col items-start gap-1 overflow-hidden bg-card p-1.5 text-left transition-colors hover:bg-accent/40",
                isToday && "bg-accent/25"
              )}
            >
              {isToday ? (
                <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
                  {format(date, "d")}
                </span>
              ) : (
                <span className={cn("text-[12px] font-semibold", !inMonth && "text-muted-foreground/50")}>
                  {format(date, "d")}
                </span>
              )}
              {visible.map((todo) => {
                const category = getParaCategory(todo);
                const colorVar = todo.completed
                  ? "var(--muted-foreground)"
                  : category
                    ? `var(${CATEGORY_COLOR_VAR[category]})`
                    : "var(--muted-foreground)";
                const tintVar = todo.completed
                  ? "var(--muted)"
                  : category
                    ? `var(${CATEGORY_TINT_VAR[category]})`
                    : "var(--secondary)";
                return (
                  <button
                    key={todo.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailTodo(todo);
                    }}
                    className={cn(
                      "w-full truncate rounded-[4px] border-l-[3px] px-1.5 py-0.5 text-left text-[11px] font-medium",
                      todo.completed && "line-through"
                    )}
                    style={{ borderLeftColor: colorVar, backgroundColor: tintVar, color: colorVar }}
                  >
                    {todo.content}
                  </button>
                );
              })}
              {moreCount > 0 ? <span className="text-[10px] text-muted-foreground">+{moreCount}개 더보기</span> : null}
            </div>
          );
        })}
      </div>

      {detailTodo ? (
        <TodoDetailModal
          todo={detailTodo}
          onEdit={onEdit}
          onMemoEdit={onMemoEdit}
          onRemove={onRemove}
          onClose={() => setDetailTodo(null)}
        />
      ) : null}
    </div>
  );
}

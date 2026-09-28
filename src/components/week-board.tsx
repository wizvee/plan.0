"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, format, isSameMonth, startOfMonth, subMonths } from "date-fns";

import { useTodos } from "@/lib/app-data/use-todos";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import {
  dayKeyOf,
  mondayOf,
  parseDateKey,
  shiftWeeks,
  toDateKey,
  weekNumberLabel,
} from "@/lib/week";
import { cn } from "@/lib/utils";
import { useTodayKey } from "@/lib/use-today";
import { DAY_KEYS, DAY_LABELS_KO, type DayKey, type Todo } from "@/lib/types";
import { WeekCalendar } from "@/components/week-calendar";
import { MonthCalendar } from "@/components/month-calendar";
import { CalendarHeader } from "@/components/calendar-header";

export function WeekBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { todos } = useTodos();
  const { projects, areas, resources } = useContainers();
  const actions = useTodoActions();
  // URL이 화면 상태의 유일한 출처다 — monday/viewMode/displayMonth를 별도 state로 들고 있다가
  // router.replace로 동기화하는 대신, 매 렌더마다 searchParams에서 직접 계산한다. 이렇게 해야
  // 미니 캘린더처럼 다른 컴포넌트가 URL만 바꿔도(같은 라우트에 있어도) 화면이 바로 반응한다.
  const weekParam = searchParams.get("week");
  const monday = useMemo(() => mondayOf(parseDateKey(weekParam) ?? new Date()), [weekParam]);
  const viewMode: "week" | "month" = searchParams.get("view") === "month" ? "month" : "week";
  const monthParam = searchParams.get("month");
  const displayMonth = useMemo(() => startOfMonth(parseDateKey(monthParam) ?? monday), [monthParam, monday]);

  const [mobileDay, setMobileDay] = useState<DayKey>("mon");

  const weekKey = toDateKey(monday);
  const todayKey = useTodayKey();

  function goToWeek(date: Date) {
    router.replace(`/?week=${toDateKey(mondayOf(date))}`, { scroll: false });
  }

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

  const replace = (url: string) => router.replace(url, { scroll: false });
  const weekUrl = (date: Date) => `/?week=${toDateKey(mondayOf(date))}`;
  const monthUrl = (date: Date) => `/?view=month&month=${toDateKey(startOfMonth(date))}`;

  return (
    <div className="flex min-h-0 flex-col">
      <CalendarHeader
        viewMode={viewMode}
        monday={monday}
        displayMonth={displayMonth}
        onPrev={() => replace(viewMode === "week" ? weekUrl(shiftWeeks(monday, -1)) : monthUrl(subMonths(displayMonth, 1)))}
        onNext={() => replace(viewMode === "week" ? weekUrl(shiftWeeks(monday, 1)) : monthUrl(addMonths(displayMonth, 1)))}
        onToday={() => replace(viewMode === "week" ? weekUrl(new Date()) : monthUrl(new Date()))}
        onSelectView={(mode) =>
          replace(
            mode === "month"
              ? monthUrl(addDays(monday, 3))
              : // 월 → 주: 보고 있던 달이 이번 달이면 이번 주, 아니면 그 달 첫 주
                weekUrl(isSameMonth(displayMonth, new Date()) ? new Date() : displayMonth)
          )
        }
        onSelectDate={(date) => replace(weekUrl(date))}
        onSelectMonth={(month) => replace(monthUrl(month))}
      />

      {viewMode === "week" ? (
        <>
          <div className="border-b border-border px-3 pb-2.5 sm:hidden">
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
                    aria-pressed={isSelected}
                    aria-label={format(date, "M월 d일")}
                    className="flex flex-col items-center gap-1 py-1"
                  >
                    <span className={cn("text-[11px] font-medium text-muted-foreground", isToday && "text-today")}>
                      {DAY_LABELS_KO[day]}
                    </span>
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-[16px] font-medium",
                        isToday && !isSelected && "font-semibold text-today",
                        isSelected && (isToday ? "bg-today font-semibold text-white" : "bg-foreground font-semibold text-background")
                      )}
                    >
                      {format(date, "d")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-center text-[12.5px] text-muted-foreground">
              {weekNumberLabel(monday)} · {format(addDays(monday, DAY_KEYS.indexOf(mobileDay)), "M월 d일")}{" "}
              {DAY_LABELS_KO[mobileDay]}요일
            </p>
          </div>
          <WeekCalendar
            monday={monday}
            mobileDay={mobileDay}
            itemsByDay={scheduledByDay}
            projects={projects}
            areas={areas}
            resources={resources}
            onToggle={actions.toggle}
            onRemove={actions.remove}
            onEdit={actions.edit}
            onMemoEdit={actions.editMemo}
            onUrlEdit={actions.editUrl}
            onAssignPara={actions.assignPara}
            onResize={actions.resize}
          />
        </>
      ) : (
        <MonthCalendar
          displayMonth={displayMonth}
          todos={todos}
          projects={projects}
          areas={areas}
          resources={resources}
          todayKey={todayKey}
          onSelectDay={goToWeek}
          onEdit={actions.edit}
          onMemoEdit={actions.editMemo}
          onUrlEdit={actions.editUrl}
          onAssignPara={actions.assignPara}
          onRemove={actions.remove}
        />
      )}
    </div>
  );
}

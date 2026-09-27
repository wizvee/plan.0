"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, format, startOfMonth, subMonths } from "date-fns";

import { useTodos } from "@/lib/app-data/use-todos";
import { useSignOut } from "@/lib/app-data/use-sign-out";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import {
  dayKeyOf,
  mondayOf,
  parseDateKey,
  shiftWeeks,
  toDateKey,
  weekNumberLabel,
  weekRangeLabel,
} from "@/lib/week";
import { cn } from "@/lib/utils";
import { useTodayKey } from "@/lib/use-today";
import { DAY_KEYS, DAY_LABELS_KO, type DayKey, type Todo } from "@/lib/types";
import { WeekCalendar } from "@/components/week-calendar";
import { MonthCalendar } from "@/components/month-calendar";
import { WeekNav } from "@/components/week-nav";
import { Button } from "@/components/ui/button";

export function WeekBoard() {
  const signOut = useSignOut();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { todos } = useTodos();
  const { projects, areas, resources } = useContainers();
  const actions = useTodoActions();
  // URL이 화면 상태의 유일한 출처다 — monday/viewMode/displayMonth를 별도 state로 들고 있다가
  // router.replace로 동기화하는 대신, 매 렌더마다 searchParams에서 직접 계산한다. 이렇게 해야
  // AppSidebar처럼 다른 컴포넌트가 URL만 바꿔도(같은 라우트에 있어도) 화면이 바로 반응한다.
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

  return (
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
                onClick={() => void signOut()}
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

      {viewMode === "week" ? (
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

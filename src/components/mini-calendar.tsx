"use client";

import { useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTodayKey } from "@/lib/use-today";
import { toDateKey } from "@/lib/week";
import { DAY_LABELS_KO } from "@/lib/types";

const WEEKDAY_ORDER: (keyof typeof DAY_LABELS_KO)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

interface MiniCalendarProps {
  /** 이 주(월요일 시작)의 7일을 은은하게 강조 표시한다. 없으면 "오늘"만 표시. */
  highlightWeekStart?: Date;
  onSelectDate: (date: Date) => void;
}

export function MiniCalendar({ highlightWeekStart, onSelectDate }: MiniCalendarProps) {
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(highlightWeekStart ?? new Date()));
  const todayKey = useTodayKey();

  // highlightWeekStart가 바뀌면(주차 이동, PARA 화면에서 날짜 선택 등) 표시 중인 달도 따라가게
  // 렌더 중에 동기화한다 — 이펙트 대신 이 패턴을 쓰면 한 번 더 렌더되는 걸 피할 수 있다.
  const highlightKey = highlightWeekStart ? toDateKey(highlightWeekStart) : null;
  const [syncedKey, setSyncedKey] = useState(highlightKey);
  if (highlightKey !== syncedKey) {
    setSyncedKey(highlightKey);
    if (highlightWeekStart) setDisplayMonth(startOfMonth(highlightWeekStart));
  }

  const gridStart = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const highlightRange =
    highlightWeekStart !== undefined
      ? { start: highlightWeekStart, end: addDays(highlightWeekStart, 6) }
      : null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 pb-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[13px] font-bold">
          {format(displayMonth, "M")}월 <span className="font-medium text-muted-foreground">{format(displayMonth, "yyyy")}</span>
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => setDisplayMonth((m) => subMonths(m, 1))}
            className="flex size-[22px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <ChevronLeft className="size-[13px]" />
          </button>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
            className="flex size-[22px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <ChevronRight className="size-[13px]" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAY_ORDER.map((day) => (
          <span key={day} className="text-center text-[10px] text-muted-foreground">
            {DAY_LABELS_KO[day]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const inCurrentMonth = isSameMonth(date, displayMonth);
          const isToday = dateKey === todayKey;
          const inHighlightedWeek = highlightRange ? isWithinInterval(date, highlightRange) : false;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex h-6 items-center justify-center rounded-md text-[12px] transition-colors",
                !inCurrentMonth && "text-muted-foreground/40",
                inCurrentMonth && !isToday && "text-foreground",
                inHighlightedWeek && !isToday && "bg-accent",
                isToday && "bg-primary font-bold text-primary-foreground"
              )}
            >
              {format(date, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

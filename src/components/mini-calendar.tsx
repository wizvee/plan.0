"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CaretLeft, CaretRight } from "@/components/icons";

import { cn } from "@/lib/utils";
import { useTodayKey } from "@/lib/use-today";
import { mondayOf, toDateKey } from "@/lib/week";
import { DAY_LABELS_KO } from "@/lib/types";

const WEEKDAY_ORDER: (keyof typeof DAY_LABELS_KO)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

interface MiniCalendarProps {
  /** 처음 보여줄 달 */
  initialMonth: Date;
  /** 이 주(월요일 시작)를 줄 전체 띠로 강조한다. 없으면 "오늘"만 표시. */
  highlightWeekStart?: Date;
  onSelectDate: (date: Date) => void;
  /** 상단 "2026년 9월" 라벨을 누르면 지금 보여주는 달의 월 보기로 */
  onSelectMonth: (month: Date) => void;
}

/** 애플 캘린더식 미니 달력 — 캘린더 화면 제목을 누르면 뜨는 팝오버 안에서 쓴다. */
export function MiniCalendar({ initialMonth, highlightWeekStart, onSelectDate, onSelectMonth }: MiniCalendarProps) {
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(initialMonth));
  const todayKey = useTodayKey();

  const gridStart = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const highlightKey = highlightWeekStart ? toDateKey(highlightWeekStart) : null;

  return (
    <div>
      <div className="mb-2 flex items-center pl-1.5 pr-0.5">
        <button
          type="button"
          onClick={() => onSelectMonth(displayMonth)}
          aria-label={`${format(displayMonth, "M")}월 월 보기로`}
          className="-ml-1.5 h-7 rounded-md px-1.5 text-[14px] font-bold hover:bg-black/5"
        >
          {format(displayMonth, "yyyy년 M월")}
        </button>
        <div className="ml-auto flex">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => setDisplayMonth((m) => subMonths(m, 1))}
            className="flex size-7 items-center justify-center rounded-md text-primary hover:bg-black/5"
          >
            <CaretLeft weight="bold" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
            className="flex size-7 items-center justify-center rounded-md text-primary hover:bg-black/5"
          >
            <CaretRight weight="bold" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-0.5 grid grid-cols-7">
        {WEEKDAY_ORDER.map((day) => (
          <span key={day} className="flex h-[22px] items-center justify-center text-[10.5px] font-semibold text-muted-foreground">
            {DAY_LABELS_KO[day]}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        {weeks.map((week) => {
          const highlighted = highlightKey !== null && toDateKey(mondayOf(week[0])) === highlightKey;
          return (
            <div key={toDateKey(week[0])} className={cn("grid grid-cols-7 rounded-lg", highlighted && "bg-primary/10")}>
              {week.map((date) => {
                const dateKey = toDateKey(date);
                const inMonth = isSameMonth(date, displayMonth);
                const isToday = dateKey === todayKey;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => onSelectDate(date)}
                    aria-label={format(date, "M월 d일")}
                    className="group flex h-8 items-center justify-center"
                  >
                    <span
                      className={cn(
                        "flex size-[26px] items-center justify-center rounded-full text-[12.5px] font-medium group-hover:bg-black/[0.06]",
                        !inMonth && "text-muted-foreground/50",
                        isToday && "bg-today font-bold text-white group-hover:bg-today"
                      )}
                    >
                      {format(date, "d")}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

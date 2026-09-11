"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { useDroppable } from "@dnd-kit/core";

import { CalendarBlock } from "@/components/calendar-block";
import { cn } from "@/lib/utils";
import { useTodayKey } from "@/lib/use-today";
import { DAY_KEYS, DAY_LABELS_KO, type DayKey, type Todo } from "@/lib/types";
import {
  GUTTER_WIDTH,
  HOURS_IN_DAY,
  HOUR_HEIGHT,
  INITIAL_SCROLL_HOUR,
  hourLabel,
  minutesToPx,
  nowMinutes,
} from "@/lib/time";

interface WeekCalendarProps {
  monday: Date;
  mobileDay: DayKey;
  itemsByDay: Record<DayKey, Todo[]>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onResize: (id: string, durationMinutes: number) => void;
}

function CurrentTimeLine() {
  // 서버(SSR)는 UTC로 렌더링될 수 있어서 초기값을 서버에서 계산하면 시간이 어긋난다.
  // 클라이언트가 마운트된 뒤 브라우저의 로컬 시각으로만 계산한다.
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      setMinutes(nowMinutes());
    }
    const immediate = setTimeout(update, 0);
    const id = setInterval(update, 60_000);
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, []);

  if (minutes === null) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2]" style={{ top: minutesToPx(minutes) }}>
      <div className="relative">
        <span className="absolute -left-[3px] -top-[3px] size-[7px] rounded-full bg-destructive" />
        <div className="h-px bg-destructive" />
      </div>
    </div>
  );
}

function DayGridColumn({
  day,
  items,
  isToday,
  onToggle,
  onRemove,
  onEdit,
  onResize,
}: {
  day: DayKey;
  items: Todo[];
  isToday: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onResize: (id: string, durationMinutes: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `grid:${day}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-border/60 transition-colors",
        day !== "mon" && "border-l",
        isOver && "bg-accent/25"
      )}
      style={{ height: HOURS_IN_DAY * HOUR_HEIGHT }}
    >
      {Array.from({ length: HOURS_IN_DAY }).map((_, hour) => (
        <div key={hour} className="border-t border-border/40" style={{ height: HOUR_HEIGHT }} />
      ))}
      {isToday ? <CurrentTimeLine /> : null}
      {items.map((todo) => (
        <CalendarBlock
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onRemove={onRemove}
          onEdit={onEdit}
          onResize={onResize}
        />
      ))}
    </div>
  );
}

export function WeekCalendar({
  monday,
  mobileDay,
  itemsByDay,
  onToggle,
  onRemove,
  onEdit,
  onResize,
}: WeekCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayKey = useTodayKey();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = INITIAL_SCROLL_HOUR * HOUR_HEIGHT - 24;
    }
  }, []);

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] bg-card shadow-[0_1px_1px_rgba(0,0,0,0.03)] ring-1 ring-border">
      <div className="hidden border-b border-border/70 sm:flex">
        <div style={{ width: GUTTER_WIDTH }} className="shrink-0" />
        {DAY_KEYS.map((day) => {
          const date = addDays(monday, DAY_KEYS.indexOf(day));
          const isToday = format(date, "yyyy-MM-dd") === todayKey;
          return (
            <div
              key={day}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2",
                isToday && "bg-accent/40"
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground">{DAY_LABELS_KO[day]}</span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-[15px] font-semibold",
                  isToday && "bg-primary text-primary-foreground"
                )}
              >
                {format(date, "d")}
              </span>
            </div>
          );
        })}
      </div>
      <div ref={scrollRef} className="flex overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
        <div style={{ width: GUTTER_WIDTH }} className="shrink-0">
          {Array.from({ length: HOURS_IN_DAY }).map((_, hour) => (
            <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
              {hour > 0 ? (
                <span className="absolute -top-2 right-2 text-[10.5px] text-muted-foreground">
                  {hourLabel(hour)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-1 sm:grid-cols-7">
          {DAY_KEYS.map((day) => {
            const date = addDays(monday, DAY_KEYS.indexOf(day));
            const isToday = format(date, "yyyy-MM-dd") === todayKey;
            return (
              <div key={day} className={cn(mobileDay !== day && "hidden", "sm:block")}>
                <DayGridColumn
                  day={day}
                  items={itemsByDay[day]}
                  isToday={isToday}
                  onToggle={onToggle}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  onResize={onResize}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

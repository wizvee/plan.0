"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { useDroppable } from "@dnd-kit/core";

import { CalendarBlock } from "@/components/calendar-block";
import { cn } from "@/lib/utils";
import { layoutDayBlocks, type DaySegment } from "@/lib/calendar-layout";
import type { DropTargetData } from "@/lib/dnd/drop-targets";
import { useTodayKey } from "@/lib/use-today";
import { DAY_KEYS, DAY_LABELS_KO, type Area, type DayKey, type Project, type Resource } from "@/lib/types";
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
  itemsByDay: Record<DayKey, DaySegment[]>;
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onUrlEdit: (id: string, url: string | null) => void;
  onAssignPara: (id: string, patch: { projectId: string | null; areaId: string | null; resourceId: string | null }) => void;
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
        <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-today" />
        <div className="h-0.5 bg-today" />
      </div>
    </div>
  );
}

function DayGridColumn({
  day,
  date,
  items,
  isToday,
  projects,
  areas,
  resources,
  onToggle,
  onRemove,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
  onResize,
}: {
  day: DayKey;
  /** 이 칸의 실제 날짜 (yyyy-MM-dd) — 드롭하면 이 날짜로 배치된다 */
  date: string;
  items: DaySegment[];
  isToday: boolean;
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onUrlEdit: (id: string, url: string | null) => void;
  onAssignPara: (id: string, patch: { projectId: string | null; areaId: string | null; resourceId: string | null }) => void;
  onResize: (id: string, durationMinutes: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid:${day}`,
    data: { type: "calendar-day", date } satisfies DropTargetData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-black/[0.06] transition-colors sm:border-l",
        (day === "sat" || day === "sun") && "bg-black/[0.015]",
        isOver && "bg-primary/[0.07]"
      )}
      style={{ height: HOURS_IN_DAY * HOUR_HEIGHT }}
    >
      {Array.from({ length: HOURS_IN_DAY }).map((_, hour) => (
        <div key={hour} className="border-t border-black/[0.07]" style={{ height: HOUR_HEIGHT }} />
      ))}
      {isToday ? <CurrentTimeLine /> : null}
      {layoutDayBlocks(items).map(({ segment, top, left, width, nested }) => (
        <CalendarBlock
          key={segment.todo.id}
          todo={segment.todo}
          segment={segment}
          placement={{ top, left, width, nested }}
          projects={projects}
          areas={areas}
          resources={resources}
          onToggle={onToggle}
          onRemove={onRemove}
          onEdit={onEdit}
          onMemoEdit={onMemoEdit}
          onUrlEdit={onUrlEdit}
          onAssignPara={onAssignPara}
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
  projects,
  areas,
  resources,
  onToggle,
  onRemove,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
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
    <div className="flex min-h-0 flex-col border-t border-border">
      <div className="hidden h-14 border-b border-border sm:flex">
        <div style={{ width: GUTTER_WIDTH }} className="shrink-0" />
        {DAY_KEYS.map((day) => {
          const date = addDays(monday, DAY_KEYS.indexOf(day));
          const isToday = format(date, "yyyy-MM-dd") === todayKey;
          return (
            <div key={day} className="flex flex-1 flex-col items-center justify-center gap-0.5">
              <span className={cn("text-[11.5px] font-medium text-muted-foreground", isToday && "text-today")}>
                {DAY_LABELS_KO[day]}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-[17px]",
                  isToday && "bg-today font-semibold text-white"
                )}
              >
                {format(date, "d")}
              </span>
            </div>
          );
        })}
      </div>
      <div ref={scrollRef} className="flex max-h-[calc(100dvh-60px-80px-var(--tabbar-h))] overflow-y-auto sm:max-h-[calc(100dvh-60px-57px)]">
        <div style={{ width: GUTTER_WIDTH }} className="shrink-0">
          {Array.from({ length: HOURS_IN_DAY }).map((_, hour) => (
            <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
              {hour > 0 ? (
                <span className="absolute -top-[7px] right-2 whitespace-nowrap text-[10.5px] text-muted-foreground/80">
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
                  date={format(date, "yyyy-MM-dd")}
                  items={itemsByDay[day]}
                  isToday={isToday}
                  projects={projects}
                  areas={areas}
                  resources={resources}
                  onToggle={onToggle}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  onMemoEdit={onMemoEdit}
                  onUrlEdit={onUrlEdit}
                  onAssignPara={onAssignPara}
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

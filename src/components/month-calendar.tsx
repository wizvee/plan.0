"use client";

import { useMemo, useState } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";

import { TodoDetailModal } from "@/components/todo-detail-modal";
import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import { DEFAULT_START_MINUTES, formatClock } from "@/lib/time";
import { toDateKey } from "@/lib/week";
import { DAY_LABELS_KO, type Area, type Project, type Resource, type Todo } from "@/lib/types";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { usePhotos } from "@/lib/app-data/use-photos";
import { useSession } from "@/lib/app-data/app-data-provider";
import { photoUrl } from "@/lib/photos";
import type { TodoPhoto } from "@/lib/types";
import { useParaColor } from "@/lib/app-data/use-para-color";

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
  const paraColor = useParaColor();
  const { coverOf } = usePhotos();
  const { googleConnected } = useSession();
  // Drive 연결이 끊겼거나 파일이 없어서 못 불러온 사진 — 그 칸은 평소 모양으로
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<string>>(() => new Set());
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

  /** 날짜 칸 배경 — 그날 할 일 중 가장 이른 할 일의 대표 사진 (PHOTOS-PLAN.md, 시안 ① full) */
  function dayPhoto(events: Todo[]): TodoPhoto | null {
    if (!googleConnected) return null;
    const start = (t: Todo) => t.startMinutes ?? DEFAULT_START_MINUTES;
    for (const todo of [...events].sort((a, b) => start(a) - start(b))) {
      if (todo.kind !== "task") continue;
      const cover = coverOf(todo.id);
      if (cover && !failedPhotoIds.has(cover.id)) return cover;
    }
    return null;
  }

  const gridStart = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="flex flex-col border-t border-border [--month-bottom:var(--tabbar-h)] sm:[--month-bottom:0px]">
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
          const photo = dayPhoto(events);

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
                "relative flex min-h-0 cursor-pointer flex-col gap-0.5 overflow-hidden border-b border-r border-black/[0.06] px-1.5 pb-1 pt-1.5 text-left hover:bg-black/[0.02]",
                isWeekend && "bg-black/[0.015]"
              )}
            >
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Drive에서 읽어오는 사용자 사진이라 next/image 최적화 대상이 아님 */}
                  <img
                    src={photoUrl(photo.id, "thumb")}
                    alt=""
                    loading="lazy"
                    onError={() => setFailedPhotoIds((prev) => new Set(prev).add(photo.id))}
                    className="pointer-events-none absolute inset-0 size-full object-cover"
                  />
                  {/* 글자가 있는 위쪽을 어둡게 — 흰 글씨가 어떤 사진 위에서도 읽히게 */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.3)_62%,rgba(0,0,0,0.12)_100%)]"
                  />
                </>
              ) : null}
              <span
                className={cn(
                  "relative mb-0.5 flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1 text-[13px] font-medium",
                  !inMonth && (photo ? "text-white/70" : "text-muted-foreground/50"),
                  photo && inMonth && "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]",
                  isToday && "bg-today font-semibold text-white"
                )}
              >
                {label}
              </span>
              {visible.map((todo) => {
                const colorVar = paraColor.ofMapping(todo).color;
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
                      "relative flex h-5 w-full items-center gap-1.5 rounded px-1 text-left text-[12px]",
                      photo ? "font-medium text-white hover:bg-white/15" : "hover:bg-black/5",
                      todo.completed && "opacity-50"
                    )}
                  >
                    <span
                      className={cn("size-[7px] shrink-0 rounded-full", photo && "shadow-[0_0_0_1.5px_rgba(255,255,255,0.95)]")}
                      style={{ backgroundColor: colorVar }}
                      aria-hidden="true"
                    />
                    <span className={cn("min-w-0 flex-1 truncate", todo.completed && "line-through")}>
                      <InlineText text={todo.content} />
                    </span>
                    {progress && progress.total > 0 ? (
                      <span
                        className={cn(
                          "shrink-0 text-[10.5px] font-semibold tabular-nums",
                          photo ? "text-white/85" : "text-muted-foreground"
                        )}
                      >
                        {progress.done}/{progress.total}
                      </span>
                    ) : null}
                    {todo.startMinutes !== null ? (
                      <span
                        className={cn(
                          "hidden shrink-0 text-[11px] lg:inline",
                          photo ? "text-white/85" : "text-muted-foreground"
                        )}
                      >
                        {formatClock(todo.startMinutes)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {moreCount > 0 ? (
                <span className={cn("relative pl-[17px] text-[11px]", photo ? "text-white/85" : "text-muted-foreground")}>
                  +{moreCount}개 더보기
                </span>
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

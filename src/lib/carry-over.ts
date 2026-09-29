import { addDays, format, isWeekend, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { DEFAULT_START_MINUTES } from "@/lib/time";
import type { Todo } from "@/lib/types";

/**
 * "다음 날로 넘기기"의 규칙 (CARRY-OVER-PLAN.md). 화면 · 저장과 무관한 순수 함수만 둔다.
 */

/** 다음 평일(yyyy-MM-dd). 금요일 → 월요일. */
export function nextWeekday(dateKey: string): string {
  let date = addDays(parseISO(dateKey), 1);
  while (isWeekend(date)) date = addDays(date, 1);
  return format(date, "yyyy-MM-dd");
}

/** "9월 29일 (화)" */
export function carryDateLabel(dateKey: string): string {
  return format(parseISO(dateKey), "M월 d일 (EEE)", { locale: ko });
}

/** "9/29 (화)" — 넘긴 하위 할 일 옆 작은 라벨 */
export function carryShortDateLabel(dateKey: string): string {
  return format(parseISO(dateKey), "M/d (EEE)", { locale: ko });
}

/**
 * 넘긴 하위 할 일이 들어갈 할 일 — `date`에 배치된, 이름 + PARA 매핑이 같은 할 일.
 * 시간은 달라도 된다. 여러 개면 시작 시각이 가장 이른 것. 없으면 null(같은 모양으로 새로 만든다).
 */
export function findCarryTarget(todos: Todo[], source: Todo, date: string): Todo | null {
  const candidates = todos.filter(
    (t) =>
      t.id !== source.id &&
      t.kind === "task" &&
      t.scheduledDate === date &&
      t.content === source.content &&
      t.projectId === source.projectId &&
      t.areaId === source.areaId &&
      t.resourceId === source.resourceId
  );
  if (candidates.length === 0) return null;
  const start = (t: Todo) => t.startMinutes ?? DEFAULT_START_MINUTES;
  return candidates.reduce((earliest, t) => (start(t) < start(earliest) ? t : earliest));
}

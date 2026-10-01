import { addDays, differenceInCalendarDays, format, isWeekend, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { DEFAULT_DURATION_MINUTES, DEFAULT_START_MINUTES, MINUTES_PER_DAY, endMinutesOf } from "@/lib/time";
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

/**
 * 이제 넘길 때인가 — 할 일이 끝나는 시각(시작 + 길이)이 지났거나, 날짜 자체가 지났으면 true.
 * true면 상세 팝업에 큰 카드로 넘기기를 유도하고, 그 전엔 푸터에 작은 버튼만 둔다.
 */
export function isCarryDue(todo: Todo, now: Date): boolean {
  if (!todo.scheduledDate) return false;
  // 끝나는 시각은 다음 날일 수 있다(자정을 넘는 블록) — 시작한 날 0시 기준 분으로 비교
  const end = endMinutesOf(todo.startMinutes ?? DEFAULT_START_MINUTES, todo.durationMinutes ?? DEFAULT_DURATION_MINUTES);
  const elapsed = differenceInCalendarDays(now, parseISO(todo.scheduledDate)) * MINUTES_PER_DAY;
  return elapsed + now.getHours() * 60 + now.getMinutes() >= end;
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

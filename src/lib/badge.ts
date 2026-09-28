/**
 * 배지 숫자 = "아직 안 한 할 일" 개수 — 서버 발송(`/api/push/*`)과 앱(셸, 7단계)이 **같은 함수**를 써서
 * 푸시로 올린 숫자와 앱을 열었을 때 숫자가 어긋나지 않게 한다. (WEBAPP-PLAN.md 2 · 6 · 7단계)
 *
 * 세는 할 일 (모두 만족):
 * - 할 일(노트 제외) · 미완료 · 날짜 = 기준일
 * - 시작 시각 ≤ 기준 시각 (시작 시각 없는 옛 데이터는 캘린더처럼 오전 9시)
 * - 컨텍스트 = 현재 컨텍스트 (현재 컨텍스트가 없으면 전부) — 하위 할 일은 세지 않음
 *
 * 순수 함수라 브라우저 · 서버 어디서든 import 가능하다. 시간대는 Asia/Seoul 고정(KST, 서머타임 없음).
 */

import { DEFAULT_START_MINUTES } from "@/lib/time";

export const TIME_ZONE = "Asia/Seoul";
/** 시작 몇 분 전에 푸시를 보내는지 */
export const PUSH_LEAD_MINUTES = 10;

/** 배지 계산에 필요한 할 일 필드만 — 앱의 `Todo`와 DB 행 둘 다 여기에 맞춰 넘긴다 */
export interface BadgeTodo {
  kind: "task" | "note";
  completed: boolean;
  scheduledDate: string | null;
  startMinutes: number | null;
  /** 이 할 일의 컨텍스트 id (매핑된 컨테이너를 따르고, 없으면 기본 컨텍스트) */
  contextId: string | null;
}

/** 어떤 순간의 서울 날짜(yyyy-MM-dd)와 자정 기준 분 */
export interface LocalMoment {
  dateKey: string;
  minutes: number;
}

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function seoulMoment(instant: Date): LocalMoment {
  const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** 서울 날짜 + 분 → 실제 시각 */
export function seoulInstant(dateKey: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:00+09:00`);
}

export function startMinutesOf(todo: Pick<BadgeTodo, "startMinutes">): number {
  return todo.startMinutes ?? DEFAULT_START_MINUTES;
}

/**
 * 컨테이너가 고른 컨텍스트(없으면 기본)를 할 일의 컨텍스트로. `useContexts().contextOfTodo`와 같은 규칙인데
 * 서버에서도 쓰려고 id만 다룬다. 지워진 컨텍스트를 가리키면 기본으로 본다.
 */
export function resolveContextId(
  containerContextId: string | null | undefined,
  defaultContextId: string | null,
  knownContextIds: ReadonlySet<string>
): string | null {
  return containerContextId && knownContextIds.has(containerContextId) ? containerContextId : defaultContextId;
}

/**
 * 배지 숫자. `at`은 기준 시각 — 앱은 지금, 푸시는 지금 + 10분(곧 시작해서 방금 알린 할 일을 미리 포함,
 * iOS는 조용한 푸시가 없어 알림이 올 때만 배지를 바꿀 수 있으므로). 자정 직전엔 기준일이 다음 날이 된다.
 */
export function countBadge(todos: Iterable<BadgeTodo>, currentContextId: string | null, at: LocalMoment): number {
  let count = 0;
  for (const todo of todos) {
    if (todo.kind !== "task" || todo.completed) continue;
    if (todo.scheduledDate !== at.dateKey) continue;
    if (startMinutesOf(todo) > at.minutes) continue;
    if (currentContextId && todo.contextId !== currentContextId) continue;
    count += 1;
  }
  return count;
}

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

import { getParaCategory } from "@/lib/category";
import { DEFAULT_DURATION_MINUTES, DEFAULT_START_MINUTES, MINUTES_PER_DAY, endMinutesOf } from "@/lib/time";
import type { Context, ParaKind, Todo } from "@/lib/types";

/**
 * 시간 균형 계산 (BALANCE-PLAN.md 3번) — 화면 · 저장과 무관한 순수 함수.
 *
 * 1. 체크(완료)한 할 일 블록만 구간으로. 자정을 넘는 블록은 하나의 구간 그대로, 주 범위(월 0시 ~ 다음 월 0시,
 *    이번 주면 ~지금)로 자른다. 지난 일요일 밤에 시작해 월요일로 넘어온 블록도 그 몫만큼 센다.
 * 2. 겹친 시간은 한 번만 — 같은 분을 여러 블록이 덮으면 원래 길이가 **가장 짧은** 블록이 가져간다
 *    (안쪽에 얹힌 블록이 더 구체적인 기록). 같으면 늦게 시작한 것 → id 순.
 * 3. 그 블록의 컨텍스트(매핑된 PARA의 컨텍스트, 없으면 기본)로 더한다 — 요일별 · 컨텍스트별 · 컨텍스트 안 PARA별.
 * 4. 수면 = 수면으로 세는 컨텍스트의 합. 깨어 있는 시간 = 범위 − 수면. 공백 = 깨어 있는 시간 − 나머지 컨텍스트 합.
 */

const WEEK_MINUTES = 7 * MINUTES_PER_DAY;

/** 컨텍스트 안 PARA 하나의 시간 — `id`가 null이면 PARA 없음 */
export interface BalanceContainer {
  kind: ParaKind | null;
  id: string | null;
  minutes: number;
}

/** 깨어 있는 시간의 컨텍스트 한 줄 (수면 제외) */
export interface BalanceRow {
  /** null = 컨텍스트가 하나도 없는 사용자의 할 일(마이그레이션 전) */
  context: Context | null;
  minutes: number;
  /** 월 ~ 일 */
  byDay: number[];
  /** 많은 순 */
  containers: BalanceContainer[];
}

export interface BalanceDay {
  /** yyyy-MM-dd */
  date: string;
  /** 센 범위 — 지난 날 1440, 오늘은 지금까지, 앞으로 올 날 0 */
  rangeMinutes: number;
  sleepMinutes: number;
  awakeMinutes: number;
  gapMinutes: number;
  /** 컨텍스트 id(없으면 "") → 분, 수면 제외 */
  byContext: Record<string, number>;
  state: "past" | "today" | "future";
}

export interface WeekBalance {
  /** 그 주 월요일 */
  weekStart: string;
  /** 센 범위 — 이번 주면 월 0시 ~ 지금, 지난 주는 7일 전체(10080분) */
  rangeMinutes: number;
  sleepMinutes: number;
  awakeMinutes: number;
  /** 깨어 있는 시간 중 기록(수면 아닌 컨텍스트 합) */
  recordedMinutes: number;
  /** 공백 = 깨어 있는 시간 − 기록 */
  gapMinutes: number;
  /** 수면 컨텍스트 — 없으면 null */
  sleepContext: Context | null;
  /** 범위가 조금이라도 있는 날 수(오늘 포함) — "하루 평균 수면"의 분모 */
  countedDays: number;
  /** 수면이 아닌 컨텍스트 — 컨텍스트 순서, 기본(기타)은 맨 뒤. 0분인 것도 있다 */
  rows: BalanceRow[];
  days: BalanceDay[];
}

interface Interval {
  todo: Todo;
  start: number;
  end: number;
  /** 겹칠 때 고르는 기준 — 원래 길이 */
  duration: number;
}

/** 블록 하나를 그 주 월요일 0시 기준 분 구간으로. 안 세는 할 일이면 null. */
function intervalOf(todo: Todo, weekStart: Date): Interval | null {
  if (todo.kind !== "task" || !todo.completed || !todo.scheduledDate) return null;
  const start = todo.startMinutes ?? DEFAULT_START_MINUTES;
  const duration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const offset = differenceInCalendarDays(parseISO(todo.scheduledDate), weekStart) * MINUTES_PER_DAY;
  return { todo, start: offset + start, end: offset + endMinutesOf(start, duration), duration };
}

/** 겹친 블록 중 이 시간을 가져갈 블록 — 가장 짧은 것, 같으면 늦게 시작한 것, 그다음 id */
function winnerOf(covering: Interval[]): Interval {
  return covering.reduce((best, cur) => {
    if (cur.duration !== best.duration) return cur.duration < best.duration ? cur : best;
    if (cur.start !== best.start) return cur.start > best.start ? cur : best;
    return cur.todo.id < best.todo.id ? cur : best;
  });
}

/**
 * 한 주의 시간 균형. `limitMinutes`는 월 0시부터 몇 분까지 셀지 — 이번 주면 지금까지, 지난 주와 비교할 때는
 * 같은 시점까지. 생략하면 `now`로 정한다(지난 주 = 7일 전체, 앞으로 올 주 = 0).
 */
export function weekBalance(
  todos: Todo[],
  contexts: Context[],
  contextOfTodo: (todo: Todo) => Context | null,
  weekStartKey: string,
  now: Date,
  limitMinutes?: number
): WeekBalance {
  const weekStart = parseISO(weekStartKey);
  const elapsed = differenceInCalendarDays(now, weekStart) * MINUTES_PER_DAY + now.getHours() * 60 + now.getMinutes();
  const range = Math.max(0, Math.min(limitMinutes ?? elapsed, WEEK_MINUTES));

  // 1. 구간 — 주 범위로 자른다. 날짜로 먼저 거른다(전 주 일요일 밤 블록 ~ 그 주 일요일)
  const firstKey = format(addDays(weekStart, -1), "yyyy-MM-dd");
  const lastKey = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const intervals: Interval[] = [];
  for (const todo of todos) {
    if (!todo.scheduledDate || todo.scheduledDate < firstKey || todo.scheduledDate > lastKey) continue;
    const interval = intervalOf(todo, weekStart);
    if (!interval) continue;
    const start = Math.max(interval.start, 0);
    const end = Math.min(interval.end, range);
    if (end > start) intervals.push({ ...interval, start, end });
  }

  // 2. 경계(블록 시작 · 끝 + 자정)로 잘라 조각마다 주인을 정한다 — 조각은 하루를 넘지 않는다
  const cuts = new Set<number>([0, range]);
  for (const i of intervals) {
    cuts.add(i.start);
    cuts.add(i.end);
  }
  for (let m = MINUTES_PER_DAY; m < range; m += MINUTES_PER_DAY) cuts.add(m);
  const points = [...cuts].sort((a, b) => a - b);

  const sleepContext = contexts.find((c) => c.isSleep) ?? null;
  const days: BalanceDay[] = Array.from({ length: 7 }, (_, i) => {
    const dayStart = i * MINUTES_PER_DAY;
    const rangeMinutes = Math.max(0, Math.min(range - dayStart, MINUTES_PER_DAY));
    return {
      date: format(addDays(weekStart, i), "yyyy-MM-dd"),
      rangeMinutes,
      sleepMinutes: 0,
      awakeMinutes: 0,
      gapMinutes: 0,
      byContext: {},
      state: rangeMinutes === MINUTES_PER_DAY ? "past" : rangeMinutes > 0 ? "today" : "future",
    };
  });
  const containerMinutes = new Map<string, Map<string, BalanceContainer>>();

  for (let p = 0; p < points.length - 1; p += 1) {
    const a = points[p];
    const b = points[p + 1];
    const covering = intervals.filter((i) => i.start <= a && i.end >= b);
    if (covering.length === 0) continue;
    const { todo } = winnerOf(covering);
    const minutes = b - a;
    const day = days[Math.floor(a / MINUTES_PER_DAY)];
    const context = contextOfTodo(todo);

    // 3. 수면은 따로, 나머지는 컨텍스트 · PARA별로
    if (context && sleepContext && context.id === sleepContext.id) {
      day.sleepMinutes += minutes;
      continue;
    }
    const contextKey = context?.id ?? "";
    day.byContext[contextKey] = (day.byContext[contextKey] ?? 0) + minutes;

    const kind = getParaCategory(todo);
    const containerId = todo.projectId ?? todo.areaId ?? todo.resourceId;
    const containerKey = kind && containerId ? `${kind}:${containerId}` : "";
    let byContainer = containerMinutes.get(contextKey);
    if (!byContainer) containerMinutes.set(contextKey, (byContainer = new Map()));
    const entry = byContainer.get(containerKey) ?? { kind, id: containerId, minutes: 0 };
    entry.minutes += minutes;
    byContainer.set(containerKey, entry);
  }

  // 4. 깨어 있는 시간 · 공백
  for (const day of days) {
    const recorded = Object.values(day.byContext).reduce((sum, m) => sum + m, 0);
    day.awakeMinutes = day.rangeMinutes - day.sleepMinutes;
    day.gapMinutes = day.awakeMinutes - recorded;
  }

  // 행 — 수면 아닌 컨텍스트를 순서대로, 기본(기타)은 맨 뒤. 컨텍스트가 없는 할 일이 있으면 마지막에 한 줄
  const ordered = contexts
    .filter((c) => !c.isSleep)
    .sort((a, b) => Number(a.isDefault) - Number(b.isDefault) || a.position - b.position);
  const rowOf = (context: Context | null): BalanceRow => {
    const key = context?.id ?? "";
    const byDay = days.map((d) => d.byContext[key] ?? 0);
    return {
      context,
      minutes: byDay.reduce((sum, m) => sum + m, 0),
      byDay,
      containers: [...(containerMinutes.get(key)?.values() ?? [])].sort((x, y) => y.minutes - x.minutes),
    };
  };
  const rows = ordered.map(rowOf);
  if (containerMinutes.has("")) rows.push(rowOf(null));

  const sleepMinutes = days.reduce((sum, d) => sum + d.sleepMinutes, 0);
  const recordedMinutes = rows.reduce((sum, r) => sum + r.minutes, 0);
  const awakeMinutes = range - sleepMinutes;
  return {
    weekStart: weekStartKey,
    rangeMinutes: range,
    sleepMinutes,
    awakeMinutes,
    recordedMinutes,
    gapMinutes: awakeMinutes - recordedMinutes,
    sleepContext,
    countedDays: days.filter((d) => d.rangeMinutes > 0).length,
    rows,
    days,
  };
}

/**
 * 이번 주와 지난주 — 지난주는 **같은 시점까지**(이번 주 목 오후 9시면 지난주 목 오후 9시까지)로 센다.
 * 지난 주를 보고 있으면 둘 다 7일 전체.
 */
export function weekBalanceWithPrevious(
  todos: Todo[],
  contexts: Context[],
  contextOfTodo: (todo: Todo) => Context | null,
  weekStartKey: string,
  now: Date
): { current: WeekBalance; previous: WeekBalance } {
  const current = weekBalance(todos, contexts, contextOfTodo, weekStartKey, now);
  const previousKey = format(addDays(parseISO(weekStartKey), -7), "yyyy-MM-dd");
  const previous = weekBalance(todos, contexts, contextOfTodo, previousKey, now, current.rangeMinutes);
  return { current, previous };
}

/** 지난주 대비 — 컨텍스트 행의 분 차이(행이 없던 컨텍스트는 0에서). ±15분 미만이면 0으로(화면에 `–`). */
export function balanceDelta(current: number, previous: number): number {
  const delta = current - previous;
  return Math.abs(delta) < 15 ? 0 : delta;
}

/** 지난주 같은 컨텍스트 행의 분 */
export function previousMinutesOf(previous: WeekBalance, context: Context | null): number {
  return previous.rows.find((r) => (r.context?.id ?? null) === (context?.id ?? null))?.minutes ?? 0;
}

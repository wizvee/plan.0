import { DEFAULT_START_MINUTES } from "@/lib/time";
import type { Todo, WeeklyGoal } from "@/lib/types";

/**
 * 주간 목표의 규칙 (GOALS-PLAN.md). 화면 · 저장과 무관한 순수 함수만 둔다.
 */

/** 3개 이하를 권한다 — 막지는 않고 안내만. */
export const RECOMMENDED_GOAL_COUNT = 3;

/** 한 목표의 진행률. `inbox` = 연결됐지만 아직 캘린더에 안 올린 할 일 수(카드 안내용). */
export interface GoalProgress {
  done: number;
  total: number;
  inbox: number;
}

/** 목표에 연결된 할 일(노트 제외)의 완료 비율. 날짜와 무관 — 다른 주로 옮긴 할 일도 센다. */
export function goalProgress(todos: Todo[], goalId: string): GoalProgress {
  let done = 0;
  let total = 0;
  let inbox = 0;
  for (const t of todos) {
    if (t.goalId !== goalId || t.kind !== "task") continue;
    total += 1;
    if (t.completed) done += 1;
    if (t.scheduledDate === null) inbox += 1;
  }
  return { done, total, inbox };
}

/** 0–1. 연결된 할 일이 없으면 0. */
export function progressRatio(progress: GoalProgress): number {
  return progress.total === 0 ? 0 : progress.done / progress.total;
}

/** 한 주의 진행률 = 목표별 진행률의 평균(목표마다 같은 무게). 목표가 없으면 null(레일은 점선 링). */
export function weekRatio(goals: WeeklyGoal[], progressOf: (goalId: string) => GoalProgress): number | null {
  if (goals.length === 0) return null;
  const sum = goals.reduce((acc, g) => acc + progressRatio(progressOf(g.id)), 0);
  return sum / goals.length;
}

/** 이번 주 7일(월–일) 날짜 키 안에 드는가. */
export function isInWeek(dateKey: string | null, weekDays: string[]): boolean {
  return dateKey !== null && weekDays.includes(dateKey);
}

/**
 * "이번 주 할 일 연결" 후보 — 그 주 캘린더에 있는 할 일(노트 제외). 같은 이름이 3일 이상 있는 할 일("업무" 블록처럼
 * 매일 두는 것)은 뺀다. 요일 → 시작 시각 순.
 */
export const REPEATED_NAME_MIN_DAYS = 3;

export function linkCandidates(todos: Todo[], weekDays: string[]): Todo[] {
  const inWeek = todos.filter((t) => t.kind === "task" && isInWeek(t.scheduledDate, weekDays));
  const daysByName = new Map<string, Set<string>>();
  for (const t of inWeek) {
    const days = daysByName.get(t.content) ?? new Set<string>();
    days.add(t.scheduledDate!);
    daysByName.set(t.content, days);
  }
  return inWeek
    .filter((t) => (daysByName.get(t.content)?.size ?? 0) < REPEATED_NAME_MIN_DAYS)
    .sort(
      (a, b) =>
        a.scheduledDate!.localeCompare(b.scheduledDate!) || (a.startMinutes ?? DEFAULT_START_MINUTES) - (b.startMinutes ?? DEFAULT_START_MINUTES)
    );
}

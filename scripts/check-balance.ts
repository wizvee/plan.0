/**
 * 시간 균형 계산 확인 — BALANCE-PLAN.md 3번. 체크한 블록만 · 겹침 한 번만(짧은 블록이 가져감) · 자정 넘김 · 주 경계 ·
 * 이번 주는 지금까지 · 수면 따로 · 공백 · 지난주 같은 시점 비교 · PARA별.
 * 실행: `npx tsx scripts/check-balance.ts` (실패하면 exit 1)
 */
import assert from "node:assert/strict";

import { balanceDelta, previousMinutesOf, weekBalance, weekBalanceWithPrevious } from "../src/lib/balance";
import type { Context, Todo } from "../src/lib/types";

function ctx(id: string, name: string, position: number, extra: Partial<Context> = {}): Context {
  return { id, name, key: id, position, isDefault: false, color: "gray", isSleep: false, ...extra };
}
const work = ctx("work", "업무", 0);
const health = ctx("health", "건강", 1);
const study = ctx("study", "지적", 2);
const people = ctx("people", "관계", 3);
const sleepCtx = ctx("sleep", "수면", 4, { isSleep: true });
const etc = ctx("personal", "기타", 5, { isDefault: true });
const contexts = [etc, sleepCtx, people, study, health, work]; // 순서가 섞여 있어도 행은 position 순 + 기본 맨 뒤

// PARA → 컨텍스트 (컨텍스트 관리에서 고른 것). 매핑 없음 = 기본
const containerContext: Record<string, Context> = {
  "area-company": work,
  "project-report": work,
  "area-fitness": health,
  "area-english": study,
  "area-sleep": sleepCtx,
};
const contextOfTodo = (t: Todo) => containerContext[t.projectId ?? t.areaId ?? ""] ?? etc;

let seq = 0;
function block(date: string, start: string, minutes: number, para: string | null, fields: Partial<Todo> = {}): Todo {
  seq += 1;
  const [h, m] = start.split(":").map(Number);
  return {
    id: `t${String(seq).padStart(3, "0")}`,
    content: `블록 ${seq}`,
    kind: "task",
    scheduledDate: date,
    completed: true,
    position: seq,
    createdAt: "2026-09-01T00:00:00Z",
    startMinutes: h * 60 + m,
    durationMinutes: minutes,
    url: null,
    memo: null,
    projectId: para?.startsWith("project-") ? para : null,
    areaId: para?.startsWith("area-") ? para : null,
    resourceId: null,
    goalId: null,
    ...fields,
  };
}

const todos: Todo[] = [
  // 이번 주 (9/28 월 ~ 10/4 일)
  block("2026-09-27", "23:30", 450, "area-sleep"), // 일 밤 → 월 7:00 — 월 0~7시(420)만 이번 주
  block("2026-09-28", "09:00", 540, "area-company"), // 월 업무 9~18
  block("2026-09-28", "10:00", 60, "project-report"), // 안쪽 회의 — 같은 업무, 짧은 블록이 가져감
  block("2026-09-28", "12:00", 60, "area-fitness"), // 안쪽 점심 운동 — 건강
  block("2026-09-28", "20:00", 60, "area-english", { completed: false }), // 체크 안 함 → 공백
  block("2026-09-28", "21:00", 60, null, { kind: "note" }), // 노트는 안 셈
  block("2026-09-29", "19:00", 150, null), // 화 친구 저녁(PARA 없음) → 기타
  block("2026-09-30", "23:45", 450, "area-sleep"), // 수 밤 → 목 7:15
  block("2026-10-01", "20:30", 60, "area-company"), // 목 20:30~21:30 — 지금(21:00)까지 30분만
  block("2026-10-04", "23:00", 420, "area-sleep"), // 일 밤 → 다음 월 6:00
  // 지난주 (9/21 ~ 9/27)
  block("2026-09-21", "09:00", 540, "area-company"),
  block("2026-09-24", "20:00", 120, null), // 목 20~22 — 같은 시점(21:00)까지 60분
  block("2026-09-24", "21:00", 60, "area-english"), // 목 21:00 시작 — 같은 시점 밖
  block("2026-09-25", "09:00", 540, "area-company"), // 금 — 같은 시점 밖
];

const now = new Date(2026, 9, 1, 21, 0); // 목 오후 9시

// 1. 이번 주 — 지금까지
const { current, previous } = weekBalanceWithPrevious(todos, contexts, contextOfTodo, "2026-09-28", now);
assert.equal(current.rangeMinutes, 3 * 1440 + 21 * 60);
assert.deepEqual(
  current.days.map((d) => [d.rangeMinutes, d.state]),
  [
    [1440, "past"],
    [1440, "past"],
    [1440, "past"],
    [1260, "today"],
    [0, "future"],
    [0, "future"],
    [0, "future"],
  ]
);
assert.equal(current.countedDays, 4);
assert.equal(current.sleepContext?.id, "sleep");
assert.deepEqual(
  current.days.map((d) => d.sleepMinutes),
  [420, 0, 15, 435, 0, 0, 0]
);
assert.equal(current.sleepMinutes, 870);
assert.deepEqual(
  current.rows.map((r) => [r.context?.name, r.minutes]),
  [
    ["업무", 480 + 30],
    ["건강", 60],
    ["지적", 0],
    ["관계", 0],
    ["기타", 150],
  ]
);
assert.equal(current.recordedMinutes, 720);
assert.equal(current.awakeMinutes, 5580 - 870);
assert.equal(current.gapMinutes, 5580 - 870 - 720);
// 요일별 — 월: 업무 480(9~18 중 12~13 빼고) · 건강 60, 공백 = 깨어 있는 1020 − 540
assert.deepEqual(current.rows[0].byDay, [480, 0, 0, 30, 0, 0, 0]);
assert.deepEqual(
  current.days.map((d) => d.gapMinutes),
  [480, 1290, 1425, 795, 0, 0, 0]
);
assert.equal(
  current.days.reduce((s, d) => s + d.gapMinutes, 0),
  current.gapMinutes
);
// 업무 안 PARA별 — 회의(짧은 블록)가 10~11시를 가져감
assert.deepEqual(
  current.rows[0].containers.map((c) => [c.kind, c.id, c.minutes]),
  [
    ["area", "area-company", 420 + 30],
    ["project", "project-report", 60],
  ]
);
assert.deepEqual(
  current.rows[4].containers.map((c) => [c.id, c.minutes]),
  [[null, 150]]
);

// 2. 지난주 — 같은 시점(목 21:00)까지만
assert.equal(previous.rangeMinutes, current.rangeMinutes);
assert.equal(previousMinutesOf(previous, work), 540);
assert.equal(previousMinutesOf(previous, etc), 60);
assert.equal(previousMinutesOf(previous, study), 0);
assert.equal(balanceDelta(510, 540), -30);
assert.equal(balanceDelta(150, 60), 90);
assert.equal(balanceDelta(65, 60), 0); // ±15분 미만은 –

// 3. 지난 주를 보면 7일 전체 — 일 밤 수면은 이번 주에 60분, 다음 주 월에 360분
const later = new Date(2026, 9, 6, 12, 0);
const fullWeek = weekBalance(todos, contexts, contextOfTodo, "2026-09-28", later);
assert.equal(fullWeek.rangeMinutes, 7 * 1440);
assert.equal(fullWeek.sleepMinutes, 870 + 60);
assert.equal(fullWeek.rows[0].minutes, 480 + 60);
assert.equal(fullWeek.countedDays, 7);
const nextWeek = weekBalance(todos, contexts, contextOfTodo, "2026-10-05", later);
assert.equal(nextWeek.days[0].sleepMinutes, 360);
const { previous: fullPrevious } = weekBalanceWithPrevious(todos, contexts, contextOfTodo, "2026-09-28", later);
assert.equal(fullPrevious.rangeMinutes, 7 * 1440);
assert.equal(previousMinutesOf(fullPrevious, work), 1080);

// 4. 앞으로 올 주 — 전부 0
const future = weekBalance(todos, contexts, contextOfTodo, "2026-10-12", now);
assert.equal(future.rangeMinutes, 0);
assert.equal(future.gapMinutes, 0);
assert.ok(future.days.every((d) => d.state === "future"));

// 5. 같은 길이로 겹치면 늦게 시작한 블록이 가져감 — 다른 컨텍스트
const tie = [block("2026-10-12", "14:00", 60, "area-fitness"), block("2026-10-12", "14:30", 60, "area-english")];
const tieWeek = weekBalance(tie, contexts, contextOfTodo, "2026-10-12", new Date(2026, 9, 20));
assert.equal(tieWeek.rows.find((r) => r.context?.id === "health")?.minutes, 30);
assert.equal(tieWeek.rows.find((r) => r.context?.id === "study")?.minutes, 60);

// 6. 체크 안 한 수면 블록은 수면이 아니라 공백 (예외 없음 — 아침에 체크하는 게 루틴)
const unchecked = [block("2026-10-12", "00:00", 420, "area-sleep", { completed: false })];
const uncheckedWeek = weekBalance(unchecked, contexts, contextOfTodo, "2026-10-12", new Date(2026, 9, 12, 8, 0));
assert.equal(uncheckedWeek.sleepMinutes, 0);
assert.equal(uncheckedWeek.gapMinutes, 8 * 60);

// 수면 컨텍스트가 없으면 수면 0, 전부 깨어 있는 시간
const noSleep = weekBalance(todos, [work, etc], (t) => (t.areaId === "area-company" ? work : etc), "2026-09-28", now);
assert.equal(noSleep.sleepMinutes, 0);
assert.equal(noSleep.sleepContext, null);
assert.equal(noSleep.awakeMinutes, 5580);

// 7. 컨텍스트가 하나도 없는 사용자(마이그레이션 전) — 컨텍스트 없는 한 줄
const bare = weekBalance(todos, [], () => null, "2026-09-28", now);
assert.equal(bare.rows.length, 1);
assert.equal(bare.rows[0].context, null);
assert.equal(bare.rows[0].minutes, bare.recordedMinutes);

console.log("check-balance: 모두 통과");

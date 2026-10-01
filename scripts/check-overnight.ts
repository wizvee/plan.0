/**
 * 자정을 넘는 블록 규칙 확인 — BALANCE-PLAN.md 5 · 6번. 조각 나누기 · 칸 안 배치 · 놓기 · 시간 편집 · 넘기기 시점.
 * 실행: `npx tsx scripts/check-overnight.ts` (실패하면 exit 1)
 */
import assert from "node:assert/strict";

import { daySegmentsOf, droppedSchedule, layoutDayBlocks } from "../src/lib/calendar-layout";
import { isCarryDue } from "../src/lib/carry-over";
import {
  HOURS_IN_DAY,
  HOUR_HEIGHT,
  durationBetween,
  formatDuration,
  isOvernight,
  minutesRangeLabel,
  parseTimeInputValue,
  toTimeInputValue,
} from "../src/lib/time";
import type { Todo } from "../src/lib/types";

let seq = 0;
function todo(content: string, fields: Partial<Todo> = {}): Todo {
  seq += 1;
  return {
    id: `t${seq}`,
    content,
    kind: "task",
    scheduledDate: "2026-09-30",
    completed: false,
    position: seq,
    createdAt: "2026-09-01T00:00:00Z",
    startMinutes: 9 * 60,
    durationMinutes: 60,
    url: null,
    memo: null,
    projectId: null,
    areaId: null,
    resourceId: null,
    goalId: null,
    ...fields,
  };
}

const DAY_PX = HOURS_IN_DAY * HOUR_HEIGHT;

// 1. 조각 나누기 — 수 23:45 → 목 7:15
const sleep = todo("수면", { scheduledDate: "2026-09-30", startMinutes: 23 * 60 + 45, durationMinutes: 450 });
const work = todo("업무", { scheduledDate: "2026-10-01", startMinutes: 9 * 60, durationMinutes: 540 });
const old = todo("화 밤", { scheduledDate: "2026-09-29", startMinutes: 23 * 60, durationMinutes: 480 });

const wed = daySegmentsOf([sleep, work, old], "2026-09-30", "2026-09-29");
assert.deepEqual(
  wed.map((s) => [s.todo.content, s.start, s.end, s.continuesBefore, s.continuesAfter]),
  [
    ["수면", 1425, 1440, false, true],
    ["화 밤", 0, 420, true, false],
  ]
);
const thu = daySegmentsOf([sleep, work, old], "2026-10-01", "2026-09-30");
assert.deepEqual(
  thu.map((s) => [s.todo.content, s.start, s.end, s.continuesBefore, s.continuesAfter]),
  [
    ["수면", 0, 435, true, false],
    ["업무", 540, 1080, false, false],
  ]
);
// 그날 안에서 끝나는 블록은 다음 날에 안 나온다
assert.equal(daySegmentsOf([work], "2026-10-02", "2026-10-01").length, 0);
// 정확히 24시에 끝나면 자정을 넘지 않는다
assert.equal(isOvernight(23 * 60, 60), false);
assert.equal(daySegmentsOf([todo("밤", { startMinutes: 23 * 60, durationMinutes: 60 })], "2026-10-01", "2026-09-30").length, 0);

// 2. 칸 안 배치 — 자정 직전 15분 조각은 최소 높이 때문에 끝을 24시에 맞춰 올린다, 이어지는 조각은 아래 틈 없음
const [placedWed] = layoutDayBlocks([wed[0]]);
const heightWed = 26; // MIN_BLOCK_HEIGHT, 이어지는 조각은 BLOCK_GAP을 빼지 않음
assert.equal(placedWed.top + heightWed, DAY_PX);
// 그날 안에서 끝나는 자정 직전 15분 블록도 칸 밖으로 안 나간다
const late = todo("늦은 메모", { startMinutes: 23 * 60 + 45, durationMinutes: 15 });
const [placedLate] = layoutDayBlocks(daySegmentsOf([late], "2026-09-30", "2026-09-29"));
assert.ok(placedLate.top + 23 <= DAY_PX - 3);
// 0시 조각은 맨 위
assert.equal(layoutDayBlocks([thu[0]])[0].top, 0);

// 3. 놓기 — 다음 날 조각은 블록 시작에서 15분 뒤(24시 − 23:45)라, 목 1:00에 놓으면 블록 시작은 목 0:45
assert.deepEqual(droppedSchedule(sleep, "2026-10-01", 60, 15), {
  scheduledDate: "2026-10-01",
  startMinutes: 45,
  durationMinutes: 450,
});
// 다음 날 조각을 목 0:00에 놓으면 → 수 23:45 그대로(전날로)
assert.deepEqual(droppedSchedule(sleep, "2026-10-01", 0, 15), {
  scheduledDate: "2026-09-30",
  startMinutes: 1425,
  durationMinutes: 450,
});
// 앞 조각을 금 22:00에 놓으면 금 22:00 시작(자정 넘는 블록 유지)
assert.deepEqual(droppedSchedule(sleep, "2026-10-02", 22 * 60, 0), {
  scheduledDate: "2026-10-02",
  startMinutes: 1320,
  durationMinutes: 450,
});
// 자정을 안 넘던 블록은 끌어서 넘기지 않는다 — 23:30에 1시간 블록 → 23:00
assert.deepEqual(droppedSchedule(work, "2026-10-01", 23 * 60 + 30, 0), {
  scheduledDate: "2026-10-01",
  startMinutes: 15 * 60,
  durationMinutes: 540,
});
assert.equal(droppedSchedule(todo("한 시간"), "2026-10-01", 23 * 60 + 30, 0).startMinutes, 23 * 60);

// 4. 시간 편집 — 끝이 시작보다 이르면 다음 날, 같으면 24시간
assert.equal(durationBetween(23 * 60 + 45, 7 * 60 + 15), 450);
assert.equal(durationBetween(9 * 60, 18 * 60), 540);
assert.equal(durationBetween(9 * 60, 9 * 60), 1440);
assert.equal(toTimeInputValue(23 * 60 + 45), "23:45");
assert.equal(toTimeInputValue(1440 + 435), "07:15");
assert.equal(parseTimeInputValue("07:15"), 435);
assert.equal(parseTimeInputValue("24:00"), null);
assert.equal(parseTimeInputValue(""), null);
assert.equal(formatDuration(450), "7시간 30분");
assert.equal(formatDuration(45), "45분");
assert.equal(formatDuration(1440), "24시간");
assert.equal(minutesRangeLabel(23 * 60 + 45, 450), "오후 11:45 - 오전 7:15");
assert.equal(minutesRangeLabel(23 * 60, 60), "오후 11시 - 오전 12시");

// 5. 넘기기 시점 — 수 밤에 시작한 블록은 목 7:15가 지나야 끝난 것
assert.equal(isCarryDue(sleep, new Date(2026, 9, 1, 7, 0)), false);
assert.equal(isCarryDue(sleep, new Date(2026, 9, 1, 7, 15)), true);
assert.equal(isCarryDue(sleep, new Date(2026, 8, 30, 23, 50)), false);
assert.equal(isCarryDue(work, new Date(2026, 9, 1, 17, 59)), false);
assert.equal(isCarryDue(work, new Date(2026, 9, 1, 18, 0)), true);
assert.equal(isCarryDue(work, new Date(2026, 9, 2, 8, 0)), true);
assert.equal(isCarryDue(work, new Date(2026, 8, 30, 20, 0)), false);

console.log("check-overnight: 모두 통과");

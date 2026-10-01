/**
 * 메모 링크 규칙 확인 — LINKS-PLAN.md. 찾기(이름 + 날짜) · 예전 "…에서 옮김" 줄 · 역링크 · 이름 바뀔 때 고치기.
 * 실행: `npx tsx scripts/check-links.ts` (실패하면 exit 1)
 */
import assert from "node:assert/strict";

import {
  hasMemoLinks,
  linkTargetOf,
  movedFromLine,
  movedTodosOf,
  resolveLink,
  retargetLinks,
  splitLinks,
  stripLinks,
} from "../src/lib/memo-links";
import type { Todo } from "../src/lib/types";

let seq = 0;
function todo(content: string, fields: Partial<Todo> = {}): Todo {
  seq += 1;
  return {
    id: `t${seq}`,
    content,
    kind: "task",
    scheduledDate: null,
    completed: false,
    position: seq,
    createdAt: "2026-10-01T09:00:00.000Z",
    startMinutes: null,
    durationMinutes: null,
    url: null,
    memo: null,
    projectId: null,
    areaId: null,
    resourceId: null,
    goalId: null,
    ...fields,
  };
}

// 매일 반복되는 이름 — 날짜로 구분
const meeting = todo("`RESP_DIV_TAB` 회의", { scheduledDate: "2026-10-01" });
const work930 = todo("L사 업무", { scheduledDate: "2026-09-30" });
const work1001 = todo("L사 업무", { scheduledDate: "2026-10-01" });
const lastYear = todo("L사 업무", { scheduledDate: "2025-10-01", createdAt: "2025-10-01T09:00:00.000Z" });
const undated = todo("자료 정리");

assert.equal(linkTargetOf(meeting), "`RESP_DIV_TAB` 회의(10/1)");
assert.equal(linkTargetOf(undated), "자료 정리");
assert.equal(movedFromLine(meeting), "- [[`RESP_DIV_TAB` 회의(10/1)]]에서 옮김");

const moved = todo("DSP 운영에 개발 인력 유저 생성", { memo: movedFromLine(meeting) });
const fromWork = todo("EAI 테스트", { memo: "L사 업무(9/30)에서 옮김", createdAt: "2026-09-30T10:00:00.000Z" });
const fromWorkToday = todo("인덱스 추가", { memo: "- [[L사 업무(10/1)]]에서 옮김\n- [ ] 확인" });
const plain = todo("그냥", { memo: "이건 회의에서 옮김" }); // 그런 이름의 할 일 없음
const all = [meeting, work930, work1001, lastYear, undated, moved, fromWork, fromWorkToday, plain];

// 찾기
assert.equal(resolveLink("`RESP_DIV_TAB` 회의(10/1)", all, moved)?.id, meeting.id);
assert.equal(resolveLink("L사 업무(9/30)", all, fromWork)?.id, work930.id);
assert.equal(resolveLink("L사 업무(10/1)", all, fromWorkToday)?.id, work1001.id, "같은 M/d면 링크를 쓴 날 이전에서 가장 가까운 해");
assert.equal(resolveLink("자료 정리", all)?.id, undated.id);
assert.equal(resolveLink("없는 할 일(10/1)", all), null);
assert.equal(resolveLink("L사 업무(10/5)", all), null, "날짜가 안 맞으면 못 찾음");
assert.equal(resolveLink("L사 업무", all, moved)?.id, work1001.id, "이름만이면 날짜 없는 것 → 없으면 가까운 날");
const selfOnly = todo("혼자");
assert.equal(resolveLink("혼자", [selfOnly], selfOnly), null, "자기 자신은 빼고 찾음");
// 이름 자체에 (M/d)가 있는 할 일
const parenName = todo("회고(10/1)");
assert.equal(resolveLink("회고(10/1)", [parenName])?.id, parenName.id);

// 나누기
assert.deepEqual(splitLinks("- 앞 [[A(1/2)|보기]] 뒤"), [
  { kind: "text", text: "- 앞 " },
  { kind: "link", target: "A(1/2)", label: "보기", legacy: false },
  { kind: "text", text: " 뒤" },
]);
assert.deepEqual(splitLinks("L사 업무(9/30)에서 옮김", { legacy: true }), [
  { kind: "link", target: "L사 업무(9/30)", label: "L사 업무(9/30)", legacy: true },
  { kind: "text", text: "에서 옮김" },
]);
assert.deepEqual(splitLinks("L사 업무(9/30)에서 옮김"), [{ kind: "text", text: "L사 업무(9/30)에서 옮김" }]);
assert.equal(stripLinks("[[`X` 회의(10/1)]]에서 옮김 · [[A|보기]]"), "`X` 회의(10/1)에서 옮김 · 보기");
assert.ok(hasMemoLinks("- [[A]]"));
assert.ok(hasMemoLinks("L사 업무(9/30)에서 옮김"));
assert.ok(!hasMemoLinks("- [ ] 회의에서 옮김"), "표시 줄은 예전 줄로 안 읽음");
assert.ok(!hasMemoLinks("그냥 메모"));

// 역링크
assert.deepEqual(movedTodosOf(meeting, all).map((t) => t.id), [moved.id]);
assert.deepEqual(movedTodosOf(work930, all).map((t) => t.id), [fromWork.id]);
assert.deepEqual(movedTodosOf(work1001, all).map((t) => t.id), [fromWorkToday.id]);
assert.deepEqual(movedTodosOf(lastYear, all), []);

// 이름 · 날짜가 바뀌면 고치기
assert.deepEqual(retargetLinks(all, meeting, { content: "`RESP_DIV_TAB` 협의", scheduledDate: "2026-10-01" }), [
  { id: moved.id, memo: "- [[`RESP_DIV_TAB` 협의(10/1)]]에서 옮김" },
]);
assert.deepEqual(retargetLinks(all, work930, { content: "L사 업무", scheduledDate: "2026-10-02" }), [
  { id: fromWork.id, memo: "L사 업무(10/2)에서 옮김" },
]);
assert.deepEqual(
  retargetLinks(all, work1001, { content: "L사 업무", scheduledDate: null }),
  [{ id: fromWorkToday.id, memo: "- [[L사 업무]]에서 옮김\n- [ ] 확인" }],
  "Inbox로 빼면 날짜 없는 대상"
);
assert.deepEqual(retargetLinks(all, meeting, { content: meeting.content, scheduledDate: meeting.scheduledDate }), []);
// 같은 이름이라도 다른 날 할 일을 가리키는 링크는 그대로
assert.deepEqual(retargetLinks(all, work930, { content: "L사 업무 A", scheduledDate: "2026-09-30" }).map((c) => c.id), [fromWork.id]);
// 별칭은 남긴다
const aliased = todo("메모", { memo: "참고: [[`RESP_DIV_TAB` 회의(10/1)|그 회의]]" });
assert.deepEqual(retargetLinks([...all, aliased], meeting, { content: "새 회의", scheduledDate: "2026-10-01" }), [
  { id: moved.id, memo: "- [[새 회의(10/1)]]에서 옮김" },
  { id: aliased.id, memo: "참고: [[새 회의(10/1)|그 회의]]" },
]);

console.log("check-links: ok");

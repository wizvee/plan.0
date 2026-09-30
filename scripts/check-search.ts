/**
 * 검색 규칙 확인 — SEARCH-PLAN.md 2번 기준 케이스 + 이모지 · 코드 · 줄 표시 검색.
 * 실행: `npx tsx scripts/check-search.ts` (실패하면 exit 1)
 * 실제 데이터 대신 기준 케이스의 기록 + 헷갈리게 만드는 비슷한 기록들을 넣는다.
 */
import assert from "node:assert/strict";

import { parseMemoLine, splitAnswer } from "../src/lib/memo-marks";
import { buildSearchIndex, highlightRanges, normalizeQuery, search, splitMemoMark } from "../src/lib/search";
import type { Area, Project, Subtask, Todo } from "../src/lib/types";

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
    createdAt: "2026-09-01T09:00:00Z",
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
function subtask(todoId: string, content: string, completed = false): Subtask {
  seq += 1;
  return { id: `s${seq}`, todoId, content, completed, position: seq, createdAt: "2026-09-01T09:00:00Z", carriedAt: null };
}

const projects: Project[] = [
  { id: "lsa", name: "2026 L사", status: "active", startDate: "2026-01-01", dueDate: null, createdAt: "2026-01-01T00:00:00Z", completedAt: null, driveFolderId: null, contextId: null },
];
const areas: Area[] = [
  { id: "dsp", name: "DSP", archived: false, createdAt: "2026-01-01T00:00:00Z", driveFolderId: null, contextId: null },
  { id: "ops", name: "운영", archived: false, createdAt: "2026-01-01T00:00:00Z", driveFolderId: null, contextId: null },
];

// 9/29 L사 업무 — 2026-09-30부터 결과는 메모 `[i] … → 답`으로 적는다. 예전 📝 하위 할 일도 그대로 남아 있다(실제 데이터와 같음).
const lsa929 = todo("L사 업무", {
  scheduledDate: "2026-09-29",
  projectId: "lsa",
  memo: "- [i] IBP CI-DS 성능 확인 → 740건/분\n- [ ] 통테 일정 공유",
});
const lsa930 = todo("L사 업무", { scheduledDate: "2026-09-30", projectId: "lsa" });
const lsa922 = todo("L사 업무", { scheduledDate: "2026-09-22", projectId: "lsa" });
const persist = todo("Persist View 관련 내용 정리", {
  kind: "note",
  areaId: "dsp",
  url: "https://help.sap.com/docs/persistence",
  memo: "- 가용 메모리 = (테넌트 전체 메모리 - 사용된 메모리) * 0.25\n- View Persist 시 사용 가능한 메모리는 가용 메모리를 넘을 수 없음",
});
const ibpPlan = todo("IBP 성능 테스트 계획", {
  scheduledDate: "2026-09-22",
  projectId: "lsa",
  memo: "- 대상: 수요 계획 마스터 데이터\n- [?] 병렬 처리 개수를 늘려도 되나?\n- 성능 측정은 운영 반영 전 한 번 더",
});
const dspCheck = todo("DSP 용량 점검", { scheduledDate: "2026-09-25", areaId: "dsp" });
const dspMemo = todo("DSP 스페이스 정리", {
  scheduledDate: "2026-09-28",
  areaId: "dsp",
  memo: "- 스페이스별 메모리 할당 확인\n- [ ] 안 쓰는 스페이스 삭제 요청\n- [p] 정리 기준을 먼저 합의해서 빨랐음",
});
const infra = todo("인프라 점검", {
  scheduledDate: "2026-09-24",
  areaId: "ops",
  memo: "- [?] `M_LOAD_HISTORY` 보관 기간 90일로 충분한가?\n- [i] 메모리 알림 기준은? → 80%",
});
const longMemo = todo("회의 메모", {
  scheduledDate: "2026-09-20",
  memo: ["- 참석: 5명", "- 안건 1", "- 안건 2", "- 안건 3", "- IBP 인터페이스 일정 논의", "- 안건 5", "- 안건 6", "- 안건 7", "- 다음 회의 10/2"].join("\n"),
});
const todos = [lsa929, lsa930, lsa922, persist, ibpPlan, dspCheck, dspMemo, infra, longMemo];
const subtasks: Subtask[] = [
  subtask(lsa929.id, "IBP CI-DS 성능 확인 📝 740건/분", true),
  subtask(lsa929.id, "`RESP_DIV_TAB` 운영 반영 일정 확인"),
  subtask(lsa930.id, "`DAILY_SA_TAB` 산출물 공유 📝 공유 폴더에 올림", true),
  subtask(lsa930.id, "IBP 화면 권한 확인"),
  subtask(lsa922.id, "CI-DS 스케줄 확인"),
  subtask(dspCheck.id, "메모리 사용량 공유 📝 Persist View 정리의 공식으로", true),
];

const index = buildSearchIndex({ todos, subtasks, projects, areas, resources: [] });

function ranked(query: string) {
  const result = search(index, query);
  assert.equal(result.mode, "ranked", `${query}: ranked 모드`);
  if (result.mode !== "ranked") throw new Error();
  return result;
}
let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("검색어 다듬기");
check("조사 떼기 · 한 글자 버리기 · 문장부호", () => {
  assert.deepEqual(normalizeQuery("IBP Ci-DS 성능은?").words, ["ibp", "ci-ds", "성능"]);
  assert.deepEqual(normalizeQuery("persist 시 사용 가능한 메모리 한계").words, ["persist", "사용", "가능한", "메모리", "한계"]);
  assert.deepEqual(normalizeQuery("DSP에서 0.25 계산").words, ["dsp", "0.25", "계산"]);
  assert.deepEqual(normalizeQuery("📝740").words, ["📝", "740"]);
  assert.deepEqual(normalizeQuery("[?] SAP").marks, ["?"]);
});

console.log("기준 케이스 (SEARCH-PLAN.md 2번 — 모두 1등)");
check("1. IBP Ci-DS 성능은? → 메모 [i] 줄이 가장 잘 맞는 줄, 답 740건/분", () => {
  const r = ranked("IBP Ci-DS 성능은?");
  const top = r.todos[0];
  assert.equal(top.todo.id, lsa929.id);
  // 메모 줄과 예전 📝 하위 할 일이 같은 점수면 메모가 앞 — 결과를 열면 메모 탭(4단계)
  assert.equal(top.bestSource, "memo");
  const best = top.memo!.find((l) => l?.best)!;
  assert.equal(best.raw, "- [i] IBP CI-DS 성능 확인 → 740건/분");
  assert.deepEqual(splitAnswer(parseMemoLine(best.raw).text), { question: "IBP CI-DS 성능 확인", answer: "740건/분" });
  const text = parseMemoLine(best.raw).text;
  assert.deepEqual(highlightRanges(text, r.words).map(([a, b]) => text.slice(a, b)), ["IBP", "CI-DS", "성능"]);
});
check("1-예전. 📝 하위 할 일도 같은 카드에 — 📝 뒤 740건/분", () => {
  const top = ranked("IBP Ci-DS 성능은?").todos[0];
  assert.equal(top.subtasks[0].line.text, "IBP CI-DS 성능 확인 📝 740건/분");
  assert.deepEqual(splitMemoMark(top.subtasks[0].line.text), { done: "IBP CI-DS 성능 확인", memo: "740건/분" });
});
check("2. DSP 가용 메모리 계산 방법 → 그 메모, 공식 줄이 보임", () => {
  const r = ranked("DSP 가용 메모리 계산 방법");
  const top = r.todos[0];
  assert.equal(top.todo.id, persist.id);
  assert.ok(top.memo);
  const formula = top.memo!.find((l) => l?.raw.includes("0.25"));
  assert.ok(formula && formula.best, "공식 줄이 굵게");
  assert.equal(r.paras[0]?.name, "DSP");
});
check("3. persist 시 사용 가능한 메모리 한계 → 메모 전체, 둘째 줄 굵게", () => {
  const r = ranked("persist 시 사용 가능한 메모리 한계");
  const top = r.todos[0];
  assert.equal(top.todo.id, persist.id);
  assert.equal(top.memo!.length, 2, "짧은 메모는 전체");
  assert.equal(top.memo![0]!.best, false);
  assert.equal(top.memo![1]!.best, true);
});

console.log("그 밖");
check("📝만 → 📝가 들어간 줄 전부, 최근 순", () => {
  const r = search(index, "📝");
  assert.equal(r.mode, "lines");
  if (r.mode !== "lines") return;
  assert.deepEqual(r.lines.map((l) => l.todo.scheduledDate), ["2026-09-30", "2026-09-29", "2026-09-25"]);
});
check("코드 그대로 — RESP_DIV_TAB · respdivtab", () => {
  assert.equal(ranked("RESP_DIV_TAB").todos[0].subtasks[0].line.text, "`RESP_DIV_TAB` 운영 반영 일정 확인");
  assert.equal(ranked("respdivtab").todos[0].todo.id, lsa929.id);
  assert.equal(ranked("cids 스케줄").todos[0].todo.id, lsa922.id);
});
check("절반 이상 맞아야 — 한 단어만 걸린 기록은 안 나옴", () => {
  const r = ranked("IBP 화면 권한 기준");
  assert.deepEqual(r.todos.map((t) => t.todo.id), [lsa930.id]);
});
check("PARA 이름만 걸린 할 일은 안 나옴 (줄이나 제목에서 1개 이상)", () => {
  // Persist View 노트는 DSP 영역이지만 제목 · 메모 · URL에 DSP가 없다
  const r = ranked("DSP");
  assert.deepEqual(r.todos.map((t) => t.todo.id).sort(), [dspCheck.id, dspMemo.id].sort());
  assert.deepEqual(r.paras.map((p) => p.name), ["DSP"]);
});
check("URL도 찾음", () => {
  const top = ranked("help.sap.com persistence").todos[0];
  assert.equal(top.todo.id, persist.id);
  assert.equal(top.urlMatched, true);
});
check("긴 메모 — 일치한 줄 앞뒤 1줄 + 건너뛴 자리", () => {
  const top = ranked("IBP 인터페이스 일정").todos.find((t) => t.todo.id === longMemo.id)!;
  assert.deepEqual(top.memo!.map((l) => (l ? l.raw : "…")), ["…", "- 안건 3", "- IBP 인터페이스 일정 논의", "- 안건 5", "…"]);
});
check("줄 표시 — [?]는 질문 줄만, 옵션 marks = 칩, 검색어로 좁히기", () => {
  const q = search(index, "[?]");
  assert.equal(q.mode, "lines");
  if (q.mode !== "lines") return;
  assert.deepEqual(q.lines.map((l) => l.text), ["`M_LOAD_HISTORY` 보관 기간 90일로 충분한가?", "병렬 처리 개수를 늘려도 되나?"]);
  const chip = search(index, "", { marks: ["?", "i"] });
  assert.equal(chip.mode === "lines" && chip.lines.length, 4);
  const narrowed = search(index, "IBP", { marks: ["?"] });
  assert.equal(narrowed.mode === "lines" && narrowed.lines.map((l) => l.todo.id).join(), ibpPlan.id);
  const check = search(index, "[ ]");
  assert.deepEqual(check.mode === "lines" && check.lines.map((l) => l.text), ["통테 일정 공유", "안 쓰는 스페이스 삭제 요청"]);
});
check("빈 검색어 → empty", () => {
  assert.equal(search(index, "  ? ").mode, "empty");
});

console.log(`\n${passed}개 통과`);

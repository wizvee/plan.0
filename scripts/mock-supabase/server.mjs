// 가짜 Supabase — auth /user 와 REST(select · insert · update · delete)만 흉내낸다. 화면 확인용(실제 저장 안 됨).
// 쓰는 법은 같은 폴더 README.md. 쓰기 요청(POST · PATCH · DELETE)은 기록만 하고 GET /__log 로 확인한다.
// 시나리오: 기본(9월 사진 · PARA) · SCENARIO=overlap(겹치는 일정) · later(하위 할 일 "나중에") · memo(메모 줄 표시)
// 환경변수: MOCK_GOOGLE=0 → Drive 미연결, MANY=1 → 사진 많이
import http from "node:http";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const connected = process.env.MOCK_GOOGLE !== "0";
const now = "2026-09-01T00:00:00Z";

const todo = (id, content, date, h, m, dur, extra = {}) => ({
  id, user_id: USER_ID, content, kind: "task", scheduled_date: date, completed: false, position: 0, created_at: now,
  start_minutes: h * 60 + m, duration_minutes: dur, url: null, memo: null,
  project_id: null, area_id: null, resource_id: null, goal_id: null, ...extra,
});
const P = "aaaaaaaa-0000-4000-8000-000000000001";
const A = "aaaaaaaa-0000-4000-8000-000000000002";
const R = "aaaaaaaa-0000-4000-8000-000000000003";
const T = (n) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PH = (n) => `cccccccc-0000-4000-8000-${String(n).padStart(12, "0")}`;

const todos = [
  todo(T(1), "L사 업무", "2026-09-14", 8, 30, 540, { project_id: P }),
  todo(T(2), "L사 업무", "2026-09-15", 8, 30, 540, { project_id: P }),
  todo(T(3), "성수 카페 점심", "2026-09-15", 12, 0, 60, { resource_id: R }),
  todo(T(4), "L사 업무", "2026-09-16", 8, 30, 540, { project_id: P }),
  todo(T(5), "지수 생일 저녁", "2026-09-16", 19, 0, 150, { area_id: A }),
  todo(T(6), "L사 업무", "2026-09-17", 8, 30, 540, { project_id: P }),
  todo(T(7), "김포 → 제주", "2026-09-18", 9, 0, 70, { area_id: A }),
  todo(T(8), "협재 해변 노을", "2026-09-18", 17, 30, 120, { area_id: A }),
  todo(T(9), "새별오름", "2026-09-19", 9, 0, 180, { area_id: A }),
  todo(T(10), "흑돼지 저녁", "2026-09-19", 18, 30, 90, { area_id: A }),
  todo(T(11), "귤 따기 체험", "2026-09-20", 13, 0, 120, { area_id: A }),
  todo(T(12), "국립현대미술관 전시", "2026-09-12", 14, 0, 120, { resource_id: R }),
  todo(T(13), "짧은 사진 할 일", "2026-09-17", 20, 0, 15, { area_id: A }),
];
if (process.env.SCENARIO === "overlap") {
  todos.length = 0;
  const add = (n, c, d, h, m, dur, x) => todos.push(todo(T(100 + n), c, d, h, m, dur, x));
  add(1, "위대한 12주 읽기", "2026-10-01", 7, 0, 30, { area_id: A });
  add(2, "L사 업무", "2026-10-01", 7, 30, 600, { project_id: P });
  add(3, "BSEG 최적화", "2026-10-01", 10, 0, 60, { area_id: A });
  add(4, "L사 업무", "2026-09-30", 8, 30, 540, { project_id: P });
  add(5, "BSEG 같은 시각", "2026-09-30", 8, 30, 60, { area_id: A });
  add(6, "L사 업무", "2026-09-29", 8, 30, 540, { project_id: P });
  add(7, "주간 회의", "2026-09-29", 9, 0, 60, { resource_id: R });
  add(8, "테스트", "2026-10-02", 16, 0, 30, {});
  add(9, "테스트2", "2026-10-02", 16, 30, 90, { area_id: A });
  add(10, "테스트3", "2026-10-02", 17, 0, 60, { project_id: P });
  add(11, "테스트4", "2026-10-03", 16, 30, 90, { area_id: A });
  add(12, "테스트5", "2026-10-03", 16, 30, 90, { project_id: P });
  add(13, "30분 A", "2026-09-28", 9, 0, 30, { area_id: A });
  add(14, "30분 B", "2026-09-28", 9, 30, 30, { project_id: P });
  add(15, "15분 C", "2026-09-28", 11, 0, 15, { area_id: A });
  add(16, "15분 D", "2026-09-28", 11, 15, 15, { project_id: P });
  add(17, "업무 안 1시간", "2026-10-01", 13, 0, 60, { project_id: P });
}
const subtasks = [];
if (process.env.SCENARIO === "later") {
  todos.length = 0;
  todos.push(todo(T(201), "L사 업무", "2026-09-30", 8, 0, 570, { project_id: P }));
  ["`DAILY_SA_TAB` 완료", "EAI Event Call 테스트", "RF Delta Only 테스트"].forEach((c, i) =>
    subtasks.push({ id: `eeeeeeee-0000-4000-8000-00000000000${i}`, user_id: USER_ID, todo_id: T(201), content: c, completed: false, position: i, created_at: now, carried_at: null })
  );
  subtasks.push({ id: "eeeeeeee-0000-4000-8000-000000000009", user_id: USER_ID, todo_id: T(201), content: "끝난 항목", completed: true, position: 3, created_at: now, carried_at: null });
}
if (process.env.SCENARIO === "memo") {
  // MEMO-MARKS-PLAN.md 시안 ①④⑤와 같은 데이터 — 표시 5종 · 끝남 · 답 · 보통 줄 · 예전 ☐ · 노트
  todos.length = 0;
  todos.push(
    todo(T(301), "L사 업무", "2026-09-30", 8, 0, 570, {
      project_id: P,
      memo: [
        "- [ ] SAP 인플루언스 점검 10/06까지, 이후 확인",
        "- [?] SAP ERP 통테 클라이언트 확인 후 BI 클라이언트 전략은?",
        "- [x] `DAILY_SA_TAB` 산출물 공유",
        "- [i] 인플루언스 라이선스 범위가 BI까지인가? → BI 제외, ERP만",
        "BSEG 인덱스는 다음 주 재생성 예정",
        "- [p] 통테 일정을 미리 잡아서 여유 있었음",
        "- [c] 클라이언트 번호 확인이 늦었음",
        "- [I] 다음엔 통테 전에 클라이언트 목록부터 받기",
      ].join("\n"),
    }),
    todo(T(302), "L사 업무", "2026-09-29", 8, 0, 570, { project_id: P, memo: "- [ ] `RESP_DIV_TAB` 운영 반영 일정 확인\n- [x] 끝난 확인" }),
    todo(T(303), "인프라 점검", "2026-09-24", 14, 0, 60, { area_id: A, memo: "- [?] `M_LOAD_HISTORY` 보관 기간 90일로 충분한가?" }),
    todo(T(304), "Persist View 관련 내용 정리", null, null, 0, null, {
      kind: "note",
      resource_id: R,
      start_minutes: null,
      memo: "☐ 테넌트 메모리 사용량 다시 확인\n- 가용 메모리 = (테넌트 전체 메모리 - 사용된 메모리) * 0.25\n☑ 예전 표시로 끝난 줄",
    })
  );
}
const photo = (n, todoId, file, isCover, created) => ({
  id: PH(n), user_id: USER_ID, todo_id: todoId, drive_file_id: `file-${file}`, drive_thumb_id: `thumb-${file}`,
  drive_folder_id: "folder-1", is_cover: isCover, created_at: created,
});
const photos = [
  photo(1, T(3), "cafe", false, "2026-09-15T12:30:00Z"),
  photo(2, T(5), "dinner", false, "2026-09-16T20:00:00Z"),
  photo(3, T(8), "sea", false, "2026-09-18T18:00:00Z"),
  photo(4, T(9), "tangerine", false, "2026-09-19T09:30:00Z"),
  photo(5, T(9), "oreum", true, "2026-09-19T10:00:00Z"),
  photo(6, T(9), "sea", false, "2026-09-19T11:00:00Z"),
  photo(7, T(11), "tangerine", false, "2026-09-20T14:00:00Z"),
  photo(8, T(12), "gallery", false, "2026-09-12T15:00:00Z"),
  photo(9, T(13), "cafe", false, "2026-09-17T20:05:00Z"),
  ...(process.env.MANY ? [10, 11, 12, 13].map((n) => photo(n, T(9), "gallery", false, `2026-09-19T12:0${n - 10}:00Z`)) : []),
];
const tables = {
  todos,
  todo_photos: photos,
  todo_subtasks: subtasks,
  projects: [{ id: P, user_id: USER_ID, name: "L사", status: "active", start_date: "2026-09-01", due_date: null, created_at: now, completed_at: null, drive_folder_id: null, context_id: null }],
  areas: [{ id: A, user_id: USER_ID, name: "여행", archived: false, created_at: now, drive_folder_id: null, context_id: null }],
  resources: [{ id: R, user_id: USER_ID, name: "맛집 · 전시", archived: false, created_at: now, drive_folder_id: null, context_id: null }],
  google_accounts: connected ? [{ user_id: USER_ID, refresh_token: "fake" }] : [],
};

const user = { id: USER_ID, aud: "authenticated", role: "authenticated", email: "me@example.com", app_metadata: {}, user_metadata: {}, created_at: now };
const log = [];

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Expose-Headers": "Content-Range",
    };
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    if (url.pathname === "/__log") return res.writeHead(200, { ...cors, "Content-Type": "application/json" }).end(JSON.stringify(log));
    if (url.pathname.startsWith("/auth/v1/user")) {
      return res.writeHead(200, { ...cors, "Content-Type": "application/json" }).end(JSON.stringify(user));
    }
    const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)/);
    if (m) {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          log.push({ method: req.method, table: m[1], query: url.search, body });
          // insert(...).select().single() — 넣은 행을 그대로 돌려준다
          if (req.method === "POST" && body) {
            const parsed = JSON.parse(body);
            const row = Array.isArray(parsed) ? parsed[0] : parsed;
            const full = { created_at: now, completed: false, url: null, memo: null, start_minutes: null, duration_minutes: null, scheduled_date: null, project_id: null, area_id: null, resource_id: null, goal_id: null, kind: "task", ...row };
            const obj = (req.headers.accept ?? "").includes("vnd.pgrst.object");
            return res.writeHead(201, { ...cors, "Content-Type": "application/json" }).end(JSON.stringify(obj ? full : [full]));
          }
          return res.writeHead(200, { ...cors, "Content-Type": "application/json" }).end("[]");
        }
        let rows = tables[m[1]] ?? [];
        for (const [k, v] of url.searchParams) {
          if (v.startsWith("eq.") && rows.length && k in rows[0]) rows = rows.filter((r) => String(r[k]) === v.slice(3));
        }
        const accept = req.headers.accept ?? "";
        const headers = { ...cors, "Content-Type": "application/json", "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` };
        if (accept.includes("vnd.pgrst.object")) return res.writeHead(rows.length ? 200 : 406, headers).end(JSON.stringify(rows[0] ?? {}));
        res.writeHead(200, headers).end(JSON.stringify(rows));
      });
      return;
    }
    res.writeHead(404, cors).end();
  })
  .listen(54321, () => console.log("mock supabase on 54321, google", connected));

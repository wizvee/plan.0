# 주간 목표 구현 계획

작성 2026-09-29. 기존 문서(PLANNING / HANDOFF / DESIGN / FEATURES)는 구현이 끝날 때 갱신하고, 그 전까지는 이 파일에만 적습니다.
시안: https://claude.ai/artifact/MEyZPBGLGQGQKgLdmsVi7a (① 목표 화면 · ② 레일 링 · ③ 연결 팝오버 · ④ 빈 주 · ⑤ 모바일)

> **상태: 시안 컨펌 → 구현 완료 → 마이그레이션 실행 · `main` 머지 (2026-09-29).** 남은 것: 실제 화면 확인(6번).

## 1. 무엇을 왜

- 주간 목표를 엑셀 · 옵시디언에 따로 적었더니 **월요일에 적고 나서 안 보게 됐다.** plan.0 안에서 관리하고 싶다.
- **진행률이 안 보이면 계속 미룬다.** "완독", "완료" 같은 목표는 끝나기 전까지 늘 0%라 진행률이 생길 수 없다.
- 그래서 **목표 = 이번 주 캘린더 할 일 몇 개를 묶은 것, 진행률 = 묶인 할 일의 완료 비율**로 한다.
  캘린더에서 이미 매일 하는 체크가 그대로 진행률이 되고(두 번 적지 않음), 목표를 쪼개서 시간을 잡는 게 계획 세우기 자체가 된다.
- 진행률은 **레일 맨 위 "목표" 아이콘의 링**으로 어느 화면에서든 보인다. 캘린더 본문에는 아무것도 더하지 않는다(정보량).

## 2. 합의된 규칙 (2026-09-29 사용자 확정)

| 항목 | 규칙 |
|---|---|
| 목표의 범위 | **내가 정한 개인 목표만.** 회사에서 주어진 일(A · B 리포트)은 할 일로 둔다. 회사 목표는 엑셀로 2–3주 관리해 보고 결정 |
| 단위 | 주(월요일 시작). 목표 = 한 줄 내용 + PARA 하나(선택) |
| 개수 | **3개 이하 권장.** 막지 않고, 3개가 차면 "3개 이하를 권해요" 안내만 |
| 진행률 | 목표 = 연결된 할 일(노트 제외) 중 완료 비율. 연결된 할 일이 0개면 0% + "아직 캘린더에 시간이 안 잡혔어요" |
| 레일 링 | **이번 주** 목표들의 진행률 **평균**(목표마다 같은 무게). 목표가 없으면 점선 링, 100%면 깃발 → 체크 |
| 다음 주로 넘기기 | **안 함.** 지난 주 목표는 그 주에 남는다. 이어서 할 거면 새로 적는다 |
| 연결 | ① 목표의 "+ 새 할 일" → 목표 + 목표의 PARA가 붙은 할 일이 Inbox에 생김 ② "이번 주 할 일 연결" 팝오버에서 체크 ③ Inbox 항목을 목표 카드로 끌어다 놓기 |
| 할 일 하나 | 목표 **최대 1개.** 다른 목표에 연결된 할 일을 고르면 옮겨진다 |
| 할 일 상세 팝업 | 목표 선택을 **넣지 않는다**(선택 항목을 늘리지 않기) |
| 캘린더 블록 | 목표 표시 **안 함**(정보량) |
| 레일 순서 | **목표 → 캘린더 → PARA → Inbox → 계정.** 모바일 하단 탭도 같은 순서(5칸) |

### 이번에 기본값으로 정한 것 (구현하며 바꿔도 됨)

- **주를 옮긴 할 일도 계속 센다.** 연결은 날짜와 무관 — 이번 주 목표에 연결된 할 일을 다음 주로 끌어가도 이 목표의 분모에 남는다(끝까지 100%가 안 되는 게 정직한 기록).
  캘린더에 아직 안 올린(Inbox에 있는) 연결 할 일도 센다. 카드에는 "Inbox 2개 — 캘린더에 올려 주세요"로 따로 표시.
- **연결 팝오버에서 빼는 할 일**: 그 주에 **같은 이름이 3일 이상** 있는 할 일("업무" 블록 등)과 노트.
- **넘기기(CARRY-OVER)로 새로 만든 할 일은 목표를 물려받지 않는다** — 넘기기는 "업무" 같은 하루 단위 블록용이라서.
- **목표 삭제**: 연결된 할 일은 그대로 두고 연결만 끊는다(DB `on delete set null`).
- **지난 주도 고칠 수 있다**(막지 않음). 화면은 같고 `‹ ›`로 주를 옮길 뿐.
- 목표 "완료" 체크는 따로 없다 — 100%가 곧 완료.

## 3. 데이터 모델

### 결정: 테이블 1개 + `todos` 컬럼 1개

할 일 하나는 목표 최대 1개라 연결 테이블은 필요 없다(PARA의 `project_id`와 같은 모양). 앞서 "테이블 2개"라고 했던 것보다 작다.

```sql
create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,                      -- 그 주 월요일
  content text not null check (length(btrim(content)) > 0),
  project_id uuid references public.projects (id) on delete set null,
  area_id uuid references public.areas (id) on delete set null,
  resource_id uuid references public.resources (id) on delete set null,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  constraint weekly_goals_one_para check (num_nonnulls(project_id, area_id, resource_id) <= 1),
  constraint weekly_goals_monday check (extract(isodow from week_start) = 1),
  unique (id, user_id)
);
create index if not exists weekly_goals_user_week_idx on public.weekly_goals (user_id, week_start);

-- 남의 목표에 연결하지 못하게 (goal_id, user_id) 복합 FK — 컨텍스트(20260928_webapp_push.sql)와 같은 방식.
-- 목표를 지우면 goal_id만 null (Postgres 15+ 문법)
alter table public.todos add column if not exists goal_id uuid;
alter table public.todos add constraint todos_goal_fk foreign key (goal_id, user_id)
  references public.weekly_goals (id, user_id) on delete set null (goal_id);
create index if not exists todos_goal_id_idx on public.todos (goal_id);
```

- RLS: `weekly_goals` 4개 정책(`auth.uid() = user_id`). insert/update `with check`에 PARA가 내 것인지 확인(회고 테이블과 같은 방식).
  `todos` 정책은 그대로 — 남의 목표 id는 위 복합 FK가 막는다. 재실행 안전하게 FK 추가는 `do $$ … if not exists` 블록으로 감싼다.
- Realtime: `weekly_goals`를 `supabase_realtime` publication에 추가(`todos`는 이미 있음).
- 위치: `supabase/migrations/20260929_weekly_goals.sql` (schema.sql은 늘리지 않는다).
- ⚠️ **사용자가 해야 할 일:** 배포 전에 SQL Editor에서 이 파일만 실행.

### 타입 (`src/lib/types.ts`)

```ts
export interface WeeklyGoal {
  id: string;
  weekStart: string;          // yyyy-MM-dd (월요일)
  content: string;
  projectId: string | null;
  areaId: string | null;
  resourceId: string | null;
  position: number;
  createdAt: string;
}
// Todo에 goalId: string | null 추가
```

## 4. 코드 구조 (기존 규칙 그대로)

| 파일 | 내용 |
|---|---|
| `lib/supabase/goals.ts` | `weekly_goals` 조회 + Realtime + 낙관적 추가 · 수정 · 삭제 (`reflections.ts`와 같은 모양) |
| `lib/supabase/todos.ts` | `goal_id` 매핑, `updateTodo` 패치, `addTodo` 필드에 `goalId` |
| `lib/app-data/app-data-provider.tsx` | `goals` 스토어 추가 (한 번만 구독) |
| `lib/app-data/use-goals.ts` | `goalsOfWeek(weekStart)` · `progressOfGoal(id)` · `weekProgress(weekStart)`(평균) |
| `lib/app-data/goal-actions.ts` | 목표 추가 · 이름 · PARA · 삭제, `addTodoForGoal`(Inbox에 목표 + PARA), `linkTodos(goalId, ids)` · `unlink` |
| `lib/goals.ts` | 순수 함수: 진행률 · 평균 · "반복 블록" 판별(같은 이름 3일 이상) |
| `app/(app)/goals/page.tsx` | 화면 본문만. 주는 URL `?week=`가 유일한 출처(DESIGN.md 5번 규칙 5) |
| `components/goals/goals-screen.tsx` | 머리(제목 · 주 · `‹ 이번 주 ›`) · 요약 줄 · 카드 그리드 · 빈 주 화면 |
| `components/goals/goal-card.tsx` | 링 · 제목(눌러서 수정) · PARA 점 · `···` 메뉴 · 연결된 할 일 목록(체크 가능) · 버튼 2개. 카드 전체가 드롭 영역 |
| `components/goals/goal-link-popover.tsx` | "이번 주 할 일에서 고르기" — 요일별 · 검색 · 체크 · "N개 연결" |
| `components/goals/goal-ring.tsx` | 링 하나를 레일 · 카드 · 모바일이 같이 씀 |
| `components/shell/app-rail.tsx` | 맨 위 "목표" 버튼 + 링. 셸은 `useGoals()`로 스스로 읽는다(DESIGN.md 5번 규칙 2) |
| `lib/dnd/drop-targets.ts` · `handle-drop.ts` | 드롭 대상 `{ type: "goal"; id }` 추가 → `goal_id` 설정, 할 일에 PARA가 없으면 목표의 PARA를 채움 |
| `components/todo-detail-modal.tsx` | PARA 선택 팝오버를 `components/para/para-picker.tsx`로 빼서 목표 카드와 같이 씀 (동작 변경 없음) |

## 5. 단계 (각 단계 따로 커밋 · 푸시, 단계마다 tsc · eslint · build)

1. **마이그레이션** — `20260929_weekly_goals.sql`. 로컬 Postgres에서 두 번 실행 · RLS(남의 목표 id 거부) · 월요일 check 확인. → 사용자 실행.
2. **데이터 레이어** — 타입, `goals.ts` 스토어, provider, `use-goals`, `goal-actions`, `todos.goal_id`, `lib/goals.ts`(진행률 · 평균 · 반복 판별 스크립트로 확인).
3. **목표 화면** — `/goals` 라우트, 카드 · 진행률 · 요약 줄, 목표 추가/수정/삭제, "+ 새 할 일", 빈 주 화면(확인 질문 3개 + 지난주 요약), `‹ ›` 주 이동. PARA 선택기 분리.
4. **연결** — "이번 주 할 일 연결" 팝오버, Inbox → 목표 카드 드롭(`handle-drop.ts`).
5. **레일 링 + 모바일 탭** — 셸만 수정. 레일 순서 변경(목표 맨 위).
6. **문서** — FEATURES(새 섹션) · DESIGN(목표 화면 · 링 패턴) · HANDOFF(마이그레이션 목록) · 이 문서 상태 갱신.

### 구현하며 정한 것

- 목표가 없는 주의 입력은 한 줄씩 — 하나를 적으면 바로 카드 화면으로 바뀌고, 이어서 "목표 추가" 카드로 더 적는다(시안 ④의 입력 3줄 대신).
- 모바일은 카드를 접지 않고 한 열로 다 펼친다(시안 ⑤의 접기는 필요해지면).
- 연결 팝오버는 열 때 이 목표에 연결된 할 일이 체크된 채로 시작하고, 체크를 풀면 연결이 풀린다("연결 풀기").

## 6. 확인할 것 (실제 화면)

- 캘린더에서 연결된 할 일을 체크하면 목표 카드 · 레일 링이 바로 오르는지(다른 기기 Realtime 포함)
- 목표 삭제 후 할 일이 남아 있고 연결만 풀리는지
- 월요일에 이번 주 목표가 없으면 빈 주 화면 + 지난주 요약이 나오는지
- 모바일 하단 탭 5칸이 좁지 않은지

## 7. 나중에 (이번 범위 밖)

- **다음 작업: 여러 날에 걸친 할 일** (2026-09-29 사용자 확정 — 주간 목표가 끝난 뒤, 시안부터).
  PARA 안 서브 프로젝트 대신 **할 일에 끝 날짜**를 더해 주 보기 위쪽에 **기간 막대**("A 리포트 · 월–목", 시간 없음, 체크 하나)로 보인다(애플 캘린더 여러 날 일정).
  단계는 하위 할 일로, 기간이 모자라면 넘기기 대신 끝 날짜를 늘린다. 레이아웃이 바뀌므로 시안 먼저.

- 회사 목표 — 엑셀 2–3주 결과 보고 결정. 넣게 되면 컨텍스트(회사 / 개인)로 목표 화면을 나누고 개인만 3개 권장
- 주간 회고 — 목표 화면 아래나 탭으로
- 캘린더 블록에 목표 표시

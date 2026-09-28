# 하위 할 일(서브 할 일) 구현 계획

작성 2026-09-28. 기존 문서(PLANNING / HANDOFF / DESIGN / FEATURES / REFACTORING-PLAN)는 건드리지 않고 이 파일에만 적습니다.
연결 시안: https://claude.ai/artifact/7Wfuo8WtjAY2TQrgX5GavY (보드 ① 캘린더 + Inbox · ② PARA 상세 할 일 탭 · ③ 할 일 상세)

## 1. 무엇을 왜

할 일 하나(예: "업무") 아래에 그날 처리할 작은 항목을 체크리스트로 관리하고, 그 진행률을 할 일이 보이는 모든 곳에 표시한다.

```
업무                    2/4 ━━━━━━──────
  ☑ 업무1
  ☑ 업무2
  ☐ 주간 보고서 작성
  ☐ 디자인 리뷰 코멘트 반영
```

## 2. 합의된 규칙 (시안 기준 — 바뀌면 여기부터 고친다)

| 항목 | 규칙 |
|---|---|
| 깊이 | **한 단계만.** 하위 할 일 아래에 또 하위 할 일은 없다 |
| 하위 할 일이 가진 것 | 내용 · 완료 여부 · 순서뿐. 날짜/시간/PARA/URL/메모 없음, 캘린더나 Inbox에 따로 나타나지 않고 끌어서 배치할 수도 없다 |
| 완료 연동 | **자동 연동 없음.** 하위를 다 체크해도 부모는 미완료로 남고, 부모를 완료해도 하위는 그대로 |
| 진행률 | `완료한 하위 수 / 전체 하위 수`. 하위가 0개면 진행률 UI를 아예 안 보여준다 |
| 노트 | 노트(`kind = 'note'`)에는 하위 할 일 UI가 없다. 할 일 → 노트로 바꾸면 하위 데이터는 **지우지 않고 숨기기만**, 다시 할 일로 바꾸면 그대로 돌아온다 |
| 부모 삭제 | 하위 할 일도 함께 삭제(DB `on delete cascade`) |
| PARA 진행률 | PARA 상세 상단 진행률은 지금처럼 **할 일 개수 기준**(하위는 세지 않음) |

## 3. 데이터 모델

### 결정: 별도 테이블 `todo_subtasks`

`todos`에 `subtasks jsonb` 컬럼을 두는 방법도 있지만, 체크 하나를 바꿀 때마다 배열 전체를 덮어써서
두 기기에서 동시에 체크하면 한쪽이 사라진다. 행 단위 테이블이면 체크/추가/삭제가 서로 덮어쓰지 않고,
Realtime도 기존 `todos`와 같은 방식(행 단위 이벤트)으로 붙일 수 있다.

```sql
create table if not exists public.todo_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid not null references public.todos (id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  completed boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists todo_subtasks_todo_id_idx on public.todo_subtasks (todo_id);
create index if not exists todo_subtasks_user_id_idx on public.todo_subtasks (user_id);
alter table public.todo_subtasks enable row level security;
```

- RLS: `todos`와 같은 4개 정책(select/insert/update/delete, `auth.uid() = user_id`). insert/update의
  `with check`에는 **부모 할 일도 내 것인지**를 추가로 확인한다
  (`exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid())`) — 남의 할 일 id로 끼워 넣기 방지.
- Realtime: 파일 맨 아래 publication 루프 배열에 `'todo_subtasks'` 추가.
- `position`은 `todos`와 같은 `double precision`(사이에 끼워 넣을 때 중간값 사용).
- ⚠️ **사용자가 해야 할 일:** 배포 전에 Supabase SQL Editor에서 `supabase/schema.sql` 전체를 다시 실행.
  (HANDOFF의 교훈대로 schema.sql 해당 위치와 HANDOFF 둘 다에 "다시 실행 필요"를 적는다.)

### 타입 (`src/lib/types.ts`)

```ts
export interface Subtask {
  id: string;
  todoId: string;
  content: string;
  completed: boolean;
  position: number;
  createdAt: string;
}
export interface SubtaskProgress { done: number; total: number }
```

`Todo` 타입에는 넣지 않는다 — 할 일과 하위 할 일은 따로 구독하고, 화면에서 `todoId`로 묶는다.
(할 일 목록 · 드래그 · 정렬 코드가 하위 할 일 변경 때문에 다시 계산되지 않게.)

## 4. 코드 구조 — 기존 규칙 안에서

REFACTORING-PLAN / DESIGN.md 5번 규칙을 그대로 따른다.

| 규칙 | 이번 작업에서 |
|---|---|
| 데이터 단일 출처 `lib/app-data` | 하위 할 일 구독도 `AppDataProvider`에서 **한 번만**. 화면은 `useSubtasks()` 훅으로 읽음 |
| 동작 단일 구현 `todo-actions.ts` | 하위 할 일 동작은 `useSubtaskActions()` 한 곳에 |
| 셸은 화면에서 props를 안 받음 | Inbox 카드는 `useSubtasks()`로 진행률을 스스로 읽는다 (InboxPanel props 추가 없음) |
| DnD는 `DndProvider` 하나, 처리는 `handle-drop.ts` | 하위 할 일 순서 바꾸기도 같은 컨텍스트 · 같은 파일에서 처리 (7단계) |
| 색은 시맨틱 토큰 / `lib/category.ts` | 진행률 링 · 바 색은 `CATEGORY_COLOR_VAR` / `CATEGORY_TINT_VAR`, 매핑 없으면 `--muted-foreground` |

새 파일:

```
src/lib/supabase/subtasks.ts         useSupabaseSubtasks(userId) — 조회 + Realtime + 낙관적 add/update/remove/reorder
src/lib/app-data/use-subtasks.ts     useSubtasks() → { subtasksOf(todoId), progressOf(todoId) }  (todoId별 Map, position 정렬)
src/lib/app-data/subtask-actions.ts  useSubtaskActions() → add / toggle / edit / remove / reorder
src/components/subtask/subtask-progress.tsx  원형 링 + "2/4" (Inbox 카드 · PARA 행 · 월 보기용)
src/components/subtask/subtask-list.tsx      체크리스트 + "하위 할 일 추가" 입력 (상세 모달 · PARA 펼침 공용)
```

## 5. 단계별 작업

각 단계는 따로 커밋 · 푸시하고, 단계마다 `npx tsc --noEmit` · `npx eslint` · `npm run build` 통과를 확인한다.

### 1단계 — DB 스키마
- `supabase/schema.sql`에 3번의 테이블 · 인덱스 · RLS 정책 · publication 추가 (재실행해도 안전하게 `if not exists` / `drop policy if exists`).
- 사용자에게 SQL 재실행 요청. **이 단계가 끝나야 2단계 이후를 실제로 확인할 수 있다.**

### 2단계 — 데이터 계층
- `types.ts`에 `Subtask` · `SubtaskProgress`.
- `lib/supabase/subtasks.ts`: `todos.ts`와 같은 모양(조회 1회 + `postgres_changes` 채널 `subtasks-${userId}` + 낙관적 업데이트, 실패 시 되돌림).
  - DELETE 이벤트는 `old.id`만 오므로 id로 제거(기존 todos와 동일).
  - 부모 할 일 삭제 시 cascade로 오는 DELETE 이벤트도 같은 경로로 처리되지만, 이벤트를 기다리지 않도록
    `todoActions.remove`에서 해당 `todoId`의 하위 할 일도 로컬 상태에서 즉시 뺀다.
- `AppDataProvider`에 `subtasks` 스토어 추가, `use-subtasks.ts` · `subtask-actions.ts` 작성.
  - `add(todoId, content)` — 해당 할 일의 마지막 position + 1, 빈 문자열 무시.
  - `toggle(id)`, `edit(id, content)`(빈 문자열이면 삭제), `remove(id)`, `reorder(todoId, orderedIds)`.
- 이 단계는 화면 변경 없음.

### 3단계 — 할 일 상세 모달 (시안 ③)
`todo-detail-modal.tsx` (이미 `document.body` 포털로 최상단에 뜸 — 커밋 `20f5697`)
- 제목 왼쪽에 부모 완료 체크박스(카테고리 색), 제목 아래 일정 한 줄(`9월 28일 (월) · 오전 9:00 – 11:00`, 일정 없으면 생략). 표시만 하고 수정은 기존처럼 캘린더에서.
- PARA 선택 아래에 "하위 할 일" 섹션: 제목 + `2/4` + 퍼센트, 4px 진행률 바, `SubtaskList`.
- `SubtaskList`:
  - 행: 체크박스 · 내용(클릭하면 그 자리에서 수정, Enter/blur 저장, 비우면 삭제) · hover 시 × 삭제.
  - 맨 아래 "하위 할 일 추가" 입력: Enter로 추가하고 **입력창 포커스 유지**(연속 입력).
    한글 조합 중 Enter는 무시(`e.nativeEvent.isComposing`) — 안 하면 마지막 글자가 한 번 더 추가된다.
  - 하위가 0개여도 섹션과 추가 입력은 보인다(진행률 바만 숨김).
- `kind === 'note'`이면 섹션 전체를 숨긴다.
- 모달에 필요한 데이터는 훅으로 직접 읽는다(모달을 여는 3곳 — `todo-card` · `calendar-block` · `month-calendar` — props는 늘리지 않음).

### 4단계 — 진행률 표시: Inbox · PARA 카드 (시안 ①② 목록)
- `SubtaskProgress`: 13–15px 원형 링(카테고리 색, 트랙은 틴트) + `done/total`(tabular-nums). 전부 완료면 링이 꽉 참.
- `todo-card.tsx` 메타 줄 맨 앞에 `SubtaskProgress` (날짜 · 소속 배지 앞). 하위 0개면 렌더링 안 함.
  → Inbox · PARA 상세 · 스크랩 목록에 한 번에 적용(노트는 제외).

### 5단계 — 캘린더 (시안 ①)
- `calendar-block.tsx`
  - 제목 줄 오른쪽에 `2/4`, 블록 바닥에 3px 진행률 바(카테고리 색 / 틴트 트랙). 완료 시 기존처럼 블록 전체 50%.
  - 블록 높이가 충분하면 제목 · 시간 아래에 하위 할 일을 앞에서부터 보여준다:
    보여줄 줄 수 = `floor((블록 높이 − 머리 44px − 바 8px) / 15px)`, 다 못 보여주면 마지막 줄을 "외 N개"로.
    각 줄의 작은 원형 체크는 바로 토글 가능(`onPointerDown` stopPropagation — 기존 부모 체크박스와 같은 방식이라 드래그와 안 겹침).
  - `compact`(30분 이하) 블록은 개수 텍스트만.
- `month-calendar.tsx`: 일정 한 줄 끝(시작 시각 앞)에 작은 `2/4` 텍스트만. 링 · 바는 공간이 없어 생략.

### 6단계 — PARA 상세 할 일 탭 펼치기 (시안 ②)
- `TodoCard`에 `expandable?: boolean` prop 추가 — **PARA 상세 화면만** 넘긴다(Inbox는 개수만, 시안 합의대로).
  셸 컴포넌트에 props를 넘기는 게 아니라 화면이 자기 목록 카드 모양을 고르는 것이라 셸 규칙과 무관.
- 행 왼쪽 24px 셰브런(›/⌄): 하위가 있는 할 일만 보이고, 없으면 자리만 비워서 줄 정렬 유지.
  펼치면 카드 아래에 `SubtaskList`(들여쓰기 70px, 행 높이 36px, 헤어라인 구분).
- 펼침 상태는 화면 로컬 `useState<Set<string>>` — 저장하지 않음.
- 하위가 없는 할 일에도 하위를 붙일 수 있게, 상세 모달(3단계)에서 추가하는 것이 기본 경로.
  (PARA 행에서 바로 "+ 하위 할 일"을 여는 버튼은 넣지 않는다 — 필요해지면 추가.)

### 7단계 — 하위 할 일 순서 바꾸기 (드래그)
- `drop-targets.ts`: `DraggedSubtaskData = { type: "subtask"; todoId: string }` 추가,
  `SubtaskList` 각 행에 `useSortable({ id, data })` + 그립 핸들(모바일은 항상 보임, 데스크톱은 hover — TodoCard와 같은 규칙).
- `handle-drop.ts`: `active.data.type === "subtask"`면 **같은 `todoId` 안에서만** 순서를 바꾸고
  `subtaskActions.reorder` 호출. 다른 할 일 · 캘린더 · Inbox 위에 놓으면 무시.
- `dnd-provider.tsx`: 끌고 있는 게 하위 할 일이면 `DragOverlay`에 한 줄짜리 미리보기.
- 모달은 `document.body` 포털이지만 React 트리상 `DndProvider` 안이라 같은 컨텍스트를 쓴다.
  모달 딤(`z-[60]`)보다 `DragOverlay`가 위에 보이는지 확인할 것.
- 1–6단계와 독립적이라 마지막에 둔다. 빠듯하면 이 단계만 뒤로 미뤄도 기능은 완결된다.

### 8단계 — 문서
- `FEATURES.md`에 하위 할 일 항목, `DESIGN.md` 3·6번에 진행률 표시 패턴(링 / 바 / 개수) 한 줄씩,
  `HANDOFF.md`에 결정 기록 + 파일 맵 + "schema.sql 다시 실행 필요".

## 6. 하지 않는 것 (이번 범위 밖)

- 하위 할 일의 날짜/시간 · 캘린더 배치 · 하위의 하위.
- 완료 자동 연동(규칙 표 참고) — 원하면 `useSubtaskActions.toggle`에서 한 줄로 켤 수 있게만 구조를 둔다.
- 하위 할 일 → 독립 할 일로 꺼내기 / 할 일 → 다른 할 일의 하위로 넣기.
- 시안 ②의 "완료 N" 접힘 그룹 — 현재 PARA 상세에 없는 기능이라 따로 논의.
- 스크랩 API(`/api/clip`) · Drive 내보내기에 하위 할 일 포함.

## 7. 확인 체크리스트 (배포 후 실제 화면에서)

- [ ] Inbox에서 할 일을 열면 모달이 캘린더 · 현재 시각 선 위에 뜨고 입력 · 클릭이 된다 (`20f5697` 회귀 확인)
- [ ] 모달에서 하위 추가(한글 포함, 연속 Enter) · 체크 · 수정 · 삭제 → 새로고침 후에도 유지
- [ ] 다른 기기/탭에서 체크하면 Realtime으로 반영
- [ ] Inbox 카드 · PARA 상세 · 주 보기 블록 · 월 보기에 같은 `2/4`가 보임, 하위 0개면 아무것도 안 보임
- [ ] 주 보기 블록에서 하위 체크가 드래그를 일으키지 않음, 짧은 블록은 개수만
- [ ] 노트로 전환 → 하위 UI 사라짐, 다시 할 일로 → 그대로 돌아옴
- [ ] 부모 삭제 → 하위도 사라짐(DB 확인)
- [ ] (7단계) 하위 순서 드래그 — 다른 할 일/캘린더에 놓으면 아무 일도 없음

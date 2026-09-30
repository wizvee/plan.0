# 회고(잘한 점 · 아쉬운 점 · 다음엔) 구현 계획

작성 2026-09-28. 기존 문서(PLANNING / HANDOFF / DESIGN / FEATURES / SUBTASKS-PLAN)는 건드리지 않고 이 파일에만 적습니다.
연결 시안: https://claude.ai/artifact/6vXMvW1raTc9Dhx9j25yNq (보드 ① 할 일 상세 — 회고 남기기 · ② PARA 상세 회고 탭)

> **상태: 대체됨(2026-09-30).** 회고는 이제 메모 줄 표시 `[p]` `[c]` `[I]`로 적는다 — MEMO-MARKS-PLAN.md 7번 · HANDOFF.md 38번.
> 회고 테이블 · 회고 탭 · 회고 코드는 없앴고, 이 문서는 기록으로만 남긴다.

## 1. 무엇을 왜

할 일을 하다가 "이건 잘했다 / 이건 아쉬웠다 / 다음엔 이렇게"를 가끔 짧게 남기고, 나중에 **프로젝트 단위로 모아서
전체 회고**에 쓰고 싶다. 메모에 섞어 적으면 모아볼 수 없으니, 메모와 분리된 **구조화된 항목**으로 저장한다.

```
대출 상담 받기  (프로젝트: 내 집 마련)
  👍 금리 비교표를 미리 만들어 가서 상담이 30분 만에 끝남
  👎 재직증명서를 안 챙겨서 한 번 더 방문해야 함
  💡 상담 전날 필요 서류 목록을 은행에 먼저 물어보기
```

(위 이모지는 문서 설명용. 화면은 DESIGN.md 7번대로 `ThumbsUp` / `ThumbsDown` / `Lightbulb` 아이콘.)

## 2. 합의된 규칙 (2026-09-28 사용자 확정 — 바뀌면 여기부터 고친다)

| 항목 | 규칙 |
|---|---|
| 종류 | **잘한 점(keep) · 아쉬운 점(problem) · 다음엔(try)** 세 가지 (KPT) |
| 필수 여부 | 선택. 비어 있으면 상세 팝업에서 입력 줄 하나만 보인다 |
| 개수 | 할 일 하나에 여러 개. 항목 = 종류 + 한 줄 텍스트 + 작성일 |
| 붙는 곳 | ① **할 일(task)** 또는 ② **프로젝트에 직접**(할 일 없이 "프로젝트 전체" 회고). 둘 중 정확히 하나 |
| 노트/스크랩 | **회고 없음.** 노트엔 회고 UI를 안 보여준다. 할 일 → 노트 전환 시 회고는 지우지 않고 숨기기만(하위 할 일과 같은 규칙), 다시 할 일로 바꾸면 돌아온다 |
| 할 일 삭제 | **회고도 같이 삭제** (DB `on delete cascade`) |
| 프로젝트 회고 모으기 | 프로젝트 회고 = 그 프로젝트에 **지금 매핑된 할 일들의 회고** + **프로젝트에 직접 쓴 회고**. 할 일을 다른 프로젝트로 옮기면 회고도 따라 옮겨진다(복사하지 않고 매번 계산) |
| 프로젝트 삭제 | 직접 쓴 회고는 같이 삭제. 할 일에 붙은 회고는 할 일에 그대로 남는다(할 일의 `project_id`만 null이 되는 기존 동작) |

### 이번에 기본값으로 정한 것 (시안 보면서 바꿔도 됨)

- **Area / Resource에는 회고 탭 없음.** 요청이 "프로젝트 회고"라서 1차는 Project만. Area·Resource에 매핑된 할 일도
  상세 팝업에서 회고를 남길 수는 있고, 모아보는 화면만 없다. Area는 끝이 없는 영역이라 붙이게 되면 "이번 달"처럼 기간으로 자르는 방식을 따로 논의.
- **"다음엔" → 할 일로 만들기**: 프로젝트 회고 탭의 "다음엔" 항목에 `+ 할 일로` 버튼 — 누르면 같은 내용의 할 일을
  Inbox에 만들고 그 프로젝트에 매핑. 회고 항목은 그대로 남고 "Inbox에 추가됨" 표시.
- **"회고 노트로 저장"**: 프로젝트 회고 탭 전체를 마크다운 노트로 프로젝트 Drive 폴더에 저장(기존 자료 탭 노트 · `/api/drive/notes` 재사용).
  Drive 미연결이면 버튼 대신 연결 안내.
- **완료 체크할 때 "한 줄 회고?" 묻기는 안 함.** 대신 완료된 할 일의 상세 팝업은 회고 탭으로 열린다(4번 ①).
- 정렬: 작성 순(오래된 것 위). 회고를 이야기처럼 읽히게.

## 3. 데이터 모델

### 결정: 별도 테이블 `todo_reflections`

`todos`에 컬럼 두 개(`good`/`bad`)를 두는 방법도 있지만, 할 일 하나에 여러 개 · 작성일 · 종류 추가 · 프로젝트 직접 회고를
전부 담으려면 행 단위 테이블이 맞다(하위 할 일 `todo_subtasks`와 같은 이유 — 동시 편집 시 덮어쓰기 없음, Realtime 행 단위).

```sql
create table if not exists public.todo_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid references public.todos (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null check (kind in ('keep', 'problem', 'try')),
  content text not null check (length(btrim(content)) > 0),
  created_at timestamptz not null default now(),
  -- 할 일에 붙거나(todo_id) 프로젝트에 직접 붙거나(project_id), 정확히 하나
  constraint todo_reflections_one_owner check (num_nonnulls(todo_id, project_id) = 1)
);
create index if not exists todo_reflections_todo_id_idx on public.todo_reflections (todo_id);
create index if not exists todo_reflections_project_id_idx on public.todo_reflections (project_id);
create index if not exists todo_reflections_user_id_idx on public.todo_reflections (user_id);
alter table public.todo_reflections enable row level security;
```

- **할 일 회고는 `project_id`를 저장하지 않는다** — 소속은 항상 할 일의 현재 매핑에서 계산(할 일을 옮기면 회고가 따라감).
- RLS: 4개 정책(`auth.uid() = user_id`). insert/update `with check`에 **붙는 대상도 내 것인지** 확인
  (`todo_id`면 `todos`, `project_id`면 `projects`에서 `user_id = auth.uid()`).
- Realtime: `supabase_realtime` publication에 추가.
- 위치: `supabase/migrations/20260928_todo_reflections.sql` (schema.sql은 늘리지 않음 — SUBTASKS-PLAN과 같은 규칙).
- ⚠️ **사용자가 해야 할 일:** 배포 전에 Supabase SQL Editor에서 이 마이그레이션 파일만 실행.
- Area를 나중에 붙이면 `area_id` 컬럼 추가 + check를 `num_nonnulls(todo_id, project_id, area_id) = 1`로.

### 타입 (`src/lib/types.ts`)

```ts
export type ReflectionKind = "keep" | "problem" | "try";
export interface Reflection {
  id: string;
  todoId: string | null;
  projectId: string | null;
  kind: ReflectionKind;
  content: string;
  createdAt: string;
}
```

`Todo` 타입에는 넣지 않는다(하위 할 일과 같은 이유). 개인용이라 전체 회고를 한 번에 구독하고 화면에서 묶는다:
- 할 일 상세: `todoId === todo.id`
- 프로젝트 회고: `projectId === p.id` **또는** `todoId`가 가리키는 할 일이 `kind === 'task' && projectId === p.id`

## 4. 화면 (시안 기준)

### ① 할 일 상세 팝업 (`todo-detail-modal.tsx`) — 탭으로 나눔 (2026-09-28 사용자 제안)

기능이 많아져서 팝업을 **고정 머리 + 탭 3개 + 고정 바닥**으로 나눈다.

```
[✓] 대출 상담 받기                     ×     ← 고정: 완료 체크 · 제목 · 일정
    9월 26일 (토) · 오전 10:00 – 12:00
 ◎ 프로젝트 · 내 집 마련 ⌄                   ← 고정: PARA 매핑
 [ 하위 할 일 2/2 | 회고 3 | 메모 · URL • ]   ← 세그먼트 탭
 ┌──────────── 탭 본문 (높이 고정) ─────────┐
 └──────────────────────────────────────────┘
 노트로 전환                            🗑    ← 고정
```

- **탭 이름에 내용 표시**: 하위 할 일은 `2/4`, 회고는 개수, 메모·URL은 내용이 있으면 작은 점 — 탭에 숨어 있어도 뭐가 있는지 보이게.
- **탭 본문 높이 고정**(시안 300px, 넘치면 본문만 스크롤) — 탭을 바꿔도 팝업 크기가 출렁이지 않게.
- **처음 열리는 탭**: 완료된 할 일 → **회고**(회고를 남기기 가장 좋은 순간이라, 따로 "한 줄 회고?"를 묻는 대신 이걸로 대신한다),
  미완료 → **하위 할 일**. 팝업 안에서만 기억하고 URL · localStorage에는 저장하지 않는다.
- **노트**는 하위 할 일 · 회고가 없으므로 탭 없이 지금처럼 메모 · URL만.
- 탭 이름 "할 일"은 팝업 전체가 할 일이라 헷갈려서 **"하위 할 일"**로.

**회고 탭**
- 흰 카드 헤어라인 리스트: 종류 아이콘(원형 틴트 타일) + 텍스트 + hover 시 × 삭제. 텍스트는 `InlineText`, 누르면 그 자리 수정(비우면 삭제) — `SubtaskList`와 같은 방식.
- 프로젝트에 매핑돼 있으면 위에 "OO 프로젝트 회고에도 모여요" 보조 문구.
- 맨 아래 추가 줄: **종류 드롭다운**(2026-09-28 사용자 제안 — 세그먼트 대신) + 입력칸, Enter로 연속 추가(한글 조합 안전).
  - 버튼 = 선택된 종류의 아이콘 타일 + 라벨 + `⌄`. 아이콘만 있던 세그먼트보다 뜻이 바로 읽힌다.
  - 메뉴 = macOS 메뉴 스타일(DESIGN.md 6번): 체크 표시 + 종류 아이콘 + 라벨, hover 시 primary 배경 · 흰 글자.
  - 추가 후에도 고른 종류가 유지돼서 같은 종류를 연달아 쓸 때는 드롭다운을 다시 안 열어도 된다. placeholder가 종류에 따라 바뀜.
- 공용 컴포넌트 `components/reflection/reflection-list.tsx` + `reflection-kind-select.tsx`로 만들어 ②에서도 재사용.

### ② PARA 상세 — Project에 "회고" 탭 추가 (`container-detail-screen.tsx`, `?tab=retro`)

- 탭: 개요 / 할 일 / 자료 / **회고**. 오른쪽에 "회고 노트로 저장".
- 상단 입력 줄: 종류 드롭다운(①과 같은 컴포넌트) + "프로젝트 전체에 대한 회고 (Enter)" → `project_id`로 저장.
- 3열 보드(잘한 점 / 아쉬운 점 / 다음엔), 각 열 = 흰 카드 리스트. 항목 아래 출처 줄:
  할 일에서 온 것은 체크 아이콘 + **할 일 이름**(누르면 할 일 상세 팝업), 직접 쓴 것은 "프로젝트 전체" 칩. 그 뒤 작성일.
- 직접 쓴 회고만 여기서 × 삭제. 할 일에 붙은 회고는 할 일 상세에서 고친다(출처가 한 곳이 되도록).
- 모바일(`sm:` 미만): 3열 → 세로로 쌓기.

### 색

종류별 색이 새로 필요하다 → DESIGN.md 2번 규칙대로 애플 시스템 컬러에서 토큰을 추가(컴포넌트에 hex 직접 금지):

| 토큰 | 라이트 | 다크 | 비고 |
|---|---|---|---|
| `--retro-keep` / `-tint` | `#2E9E5B` / `#E5F5EB` | `#30D158` / `#173A24` | `--category-area` 값 재사용 |
| `--retro-problem` / `-tint` | `#C26A00` / `#FFF1DC` | `#FF9F0A` / `#3D2A0F` | `--warning`(#FF9500)은 작은 아이콘에 대비 부족이라 어둡게 |
| `--retro-try` / `-tint` | `--primary` / `--accent` 재사용 | | |

텍스트는 항상 기본 전경색. 색은 아이콘 타일에만 쓴다.

## 5. 단계별 작업 (시안 컨펌 후)

1. DB 마이그레이션 + 타입
2. 데이터 계층: `lib/app-data/use-reflections.ts`(구독 · `reflectionsOfTodo` · `reflectionsOfProject`) + `reflection-actions.ts`(추가 · 수정 · 삭제)
3. 할 일 상세 팝업 탭 구조로 개편(하위 할 일 · 회고 · 메모·URL) + `ReflectionList` · `ReflectionKindSelect` 붙이기
4. 토큰 추가(`globals.css`) + `lib/reflection.ts`(종류별 라벨 · 아이콘 · 토큰 매핑)
5. PARA 상세 회고 탭 (Project만) + "다음엔 → 할 일로"
6. "회고 노트로 저장" (Drive)
7. 문서: FEATURES.md · HANDOFF.md · DESIGN.md(토큰 표) 갱신

## 6. 하지 않는 것 (이번 범위 밖)

- Area / Resource 회고 탭
- 완료 시 회고 입력 유도
- 캘린더 블록 · Inbox 카드에 회고 표시(개수 배지 등)
- 회고 검색 · 통계 · AI 요약

## 7. 확인 체크리스트 (배포 후 실제 화면에서)

- [x] SQL Editor에서 `supabase/migrations/20260928_todo_reflections.sql` 실행
- [ ] 완료된 할 일을 열면 회고 탭, 미완료는 하위 할 일 탭으로 열린다
- [ ] 종류를 바꿔가며 Enter로 여러 개 추가, 새로고침해도 남아 있다 / 다른 기기에 실시간으로 뜬다
- [ ] 프로젝트 회고 탭에 할 일 회고 + 직접 쓴 회고가 3열로 모인다, 출처를 누르면 그 할 일 상세
- [ ] 할 일을 다른 프로젝트로 옮기면 회고도 옮겨 간다 / 노트로 바꾸면 숨고 다시 할 일로 바꾸면 돌아온다
- [ ] 할 일을 지우면 그 회고도 사라진다
- [ ] "다음엔 → 할 일로" → Inbox에 이 프로젝트 할 일이 생기고 "Inbox에 추가됨", 그 할 일을 지우면 다시 "할 일로"
- [ ] "회고 노트로 저장" → 자료 탭 편집기에 채워져 열리고, 저장하면 Drive 폴더에 .md로 생긴다
- [ ] 팝업 안 종류 메뉴에서 Esc → 메뉴만 닫힘

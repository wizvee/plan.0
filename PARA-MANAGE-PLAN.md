# PARA 삭제 · 상세에서 할 일 추가 계획

작성 2026-09-28. 기존 문서(PLANNING / HANDOFF / DESIGN / FEATURES)는 건드리지 않고 이 파일에만 적습니다.
연결 시안: https://claude.ai/artifact/EWAVSDna7Zty2FzGLD2Azb
(① 할 일 탭에서 바로 추가 · ② ··· 메뉴 · ③ 삭제 확인 · ④ 모바일 할 일 탭 · ⑤ 모바일 삭제 확인)

**상태: 시안 컨펌 대기.** 아래 "정할 것"(5번)이 정해지면 구현한다.

## 1. 무엇을 왜

1. **PARA를 지울 수 없다.** 한 번 만든 Project · Area · Resource가 영원히 남는다. 잘못 만들었거나 더 필요 없는 것도
   "완료/보관"으로 흐리게 두는 것밖에 없다.
2. **PARA 상세에서 할 일을 만들 수 없다.** 프로젝트를 보면서 할 일이 떠올라도 Inbox에 적은 뒤 PARA를 고르거나
   끌어다 놓아야 한다.

> 참고: 데이터 쪽은 이미 준비돼 있다. `removeProject` · `removeArea` · `removeResource`(`lib/supabase/containers.ts`)와
> `addTodo(content, position, mapping)`의 PARA 매핑 인자(`lib/supabase/todos.ts`)는 있는데, 화면에서 부르는 곳이 없을 뿐이다.

## 2. 합의할 규칙 (시안 기준 — 바뀌면 여기부터 고친다)

### 2-1. 상세 화면에서 할 일 추가

| 항목 | 규칙 |
|---|---|
| 위치 | 할 일 탭 "할 일" 목록 카드 **맨 아래 줄**(`+ 새 할 일`). 미리알림처럼 줄을 누르면 바로 입력 |
| 입력 | Enter로 추가하고 입력칸은 비운 채 그대로 → 연속 입력. 한글 조합 중 Enter는 무시(`isComposing`). Esc는 입력 취소 |
| 만들어지는 것 | `kind = 'task'`, 이 컨테이너에 매핑(`projectId`/`areaId`/`resourceId` 중 하나), 날짜 없음 |
| Inbox | 날짜가 없는 할 일이라 **Inbox에도 보인다**(기존 규칙 `isInboxVisible` 그대로, 소속 배지 표시). Inbox 맨 끝 순서(`nextPosition(backlogItems)`) |
| 목록 순서 | 지금처럼 미완료 → 완료, 같은 그룹 안에서는 만든 순서. 새 할 일은 미완료 맨 끝(= 완료 항목 바로 위) |
| 안내 문구 | 기존 "Inbox에서 끌어다 놓으면 연결돼요" 문구는 카드 아래 작은 캡션으로 내린다: "여기서 만든 할 일은 날짜가 정해질 때까지 Inbox에도 보여요 · Inbox에서 끌어다 놓아도 연결돼요" |
| 노트(스크랩) | **1차 범위 밖.** 스크랩 섹션에는 추가 줄을 넣지 않는다(5번 질문 ②) |

### 2-2. PARA 삭제

| 항목 | 규칙 |
|---|---|
| 들어가는 곳 | PARA **상세 화면** 이름 오른쪽 `···` 버튼 → 메뉴(macOS 메뉴 스타일). 목록 카드에는 넣지 않는다(실수로 누르기 쉬움) |
| 메뉴 항목 | 이름 바꾸기 · 완료로 표시(Area/Resource는 "보관하기") · 구분선 · **○○ 삭제…**(빨강). 이름 · 상태는 지금도 눌러서 바꿀 수 있지만 메뉴에도 모아 둔다 |
| 확인 | 항상 확인 모달(`createPortal`). 되돌리기는 없다 → 모달에 "되돌릴 수 없어요" 명시 |
| 연결된 할 일 · 노트 | 모달에서 고른다. **기본값 = 연결만 끊기**: 할 일은 캘린더 · Inbox에 그대로(소속만 비움), 스크랩(노트)은 매핑이 풀리면서 Inbox로 돌아온다. **함께 삭제**: 매핑된 할 일 · 노트를 전부 지운다(하위 할 일 · 할 일 회고도 DB cascade로 같이) |
| 연결된 게 없으면 | 선택지를 숨기고 "삭제하면 되돌릴 수 없어요"만 |
| 프로젝트 회고 | 프로젝트에 직접 붙은 회고(`todo_reflections.project_id`)는 **항상 함께 삭제**(DB `on delete cascade`, 이미 그렇게 돼 있음). 모달에 개수 표시 |
| Google Drive 폴더 | **지우지 않는다.** Drive에 그대로 남고 모달에 그렇게 안내. (앱 밖 파일을 앱이 지우는 건 위험 — 필요하면 나중에 "Drive 폴더도 휴지통으로" 선택지) |
| 대안 안내 | 모달 안에 "지우지 않고 치워두고 싶다면 → 대신 완료로 표시(보관하기)" 버튼 |
| 삭제 후 | `/para?kind=<종류>` 목록으로 이동 |
| 다른 기기에서 삭제됨 | 상세 화면을 보고 있던 컨테이너가 Realtime DELETE로 사라지면 지금은 "불러오는 중..."에 멈춘다 → 로딩이 끝났는데 없으면 "삭제된 ○○이에요 · 목록으로" 빈 상태를 보여준다 |

## 3. 데이터

**DB 마이그레이션 없음.** 필요한 제약은 이미 있다:

- `todos.project_id / area_id / resource_id` → `on delete set null` (연결만 끊기)
- `todo_reflections.project_id` → `on delete cascade` (프로젝트 회고 삭제)
- `todo_subtasks.todo_id`, `todo_reflections.todo_id` → `on delete cascade` (할 일을 지우면 하위 · 회고도)

"함께 삭제"는 한 번에 처리하는 서버 트랜잭션이 없으니 순서로 보장한다:
1. `todos`에서 `<kind>_id = id`인 행 삭제 → 2. 컨테이너 행 삭제.
1이 실패하면 2를 하지 않는다(할 일이 남은 채 컨테이너만 사라지는 것보다, 둘 다 남는 게 안전).

## 4. 구현 순서

1. **데이터 훅**
   - `lib/supabase/todos.ts`: `removeTodosMappedTo(kind, id)` — 로컬에서 먼저 빼고 `delete().eq('<kind>_id', id)`.
     `clearMappingTo(kind, id)` — 로컬에서 해당 매핑만 `null`로(DB는 FK가 처리, Realtime UPDATE가 늦게 와도 화면은 바로 반영).
   - `lib/supabase/reflections.ts`: `dropReflectionsOfProject(projectId)` (로컬만, DB는 cascade).
   - `lib/supabase/subtasks.ts`: 지운 할 일들의 하위를 로컬에서 빼는 건 기존 `dropSubtasksOf` 반복.
   - `lib/app-data/`에 `useContainerActions()` 추가 — `removeContainer(kind, id, { withItems })` 하나로
     위 함수들 + `removeProject/Area/Resource`를 순서대로 부른다. 화면은 이것만 쓴다(할 일의 `useTodoActions`와 같은 방식).
   - `useTodoActions()`에 `addToContainer(content, kind, id)` 추가 — `addTodo(content, nextPosition(backlogItems), { <kind>Id: id })`.
2. **할 일 추가 줄** — `components/para/add-mapped-todo-row.tsx`(새 파일). `AddTodoForm`과 같은 입력 동작(Enter · 조합 안전)이지만
   카드 안 한 줄 모양. `container-detail-screen.tsx` 할 일 카드 맨 아래에 넣고, 기존 안내 문구를 캡션으로 옮김.
3. **··· 메뉴** — `components/para/container-menu.tsx`(새 파일). 기존 드롭다운(`ReflectionKindSelect` · 보기 드롭다운)과 같은
   macOS 메뉴 스타일, `useDismiss`로 바깥 클릭 · Esc 닫기. 이름 바꾸기는 기존 `startEditingName` 재사용.
4. **삭제 확인 모달** — `components/para/delete-container-dialog.tsx`(새 파일). `createPortal(…, document.body)`,
   라디오 2개(연결만 끊기 / 함께 삭제), 개수(할 일 · 스크랩 · 프로젝트 회고)는 이미 계산된 `mappedTasks` · `mappedNotes` ·
   `reflectionsOfProject`에서. 확인 → `removeContainer` → `router.replace('/para?kind=…')`.
5. **삭제된 컨테이너 빈 상태** — `container-detail-screen.tsx`에서 `loading`이 끝났는데 `container`가 없으면 안내.
6. **문서** — FEATURES.md(PARA 상세 표에 추가/삭제 행), HANDOFF.md 작업 이력, DESIGN.md 6번 "PARA 상세"에 `···` 메뉴 · 추가 줄 한 줄씩.

ESLint 규칙(화면은 `components/shell/*` import 금지)과 충돌 없음 — 전부 화면 쪽 컴포넌트.

## 5. 정할 것 (사용자 확인 필요)

1. **삭제 시 연결된 할 일 · 노트 기본값** — 시안은 "연결만 끊기"가 기본이고 모달에서 "함께 삭제"를 고를 수 있다.
   선택지 없이 항상 연결만 끊기로 단순하게 갈지?
2. **스크랩(노트)도 상세에서 추가?** — 시안은 할 일만. 스크랩 섹션에도 `+ 새 노트` 줄을 넣을지?
3. **삭제 입구** — 상세 화면 `···` 메뉴에만 둘지, PARA 목록 카드에도(길게 누르기/우클릭 메뉴) 둘지?
4. **Drive 폴더** — 지금 계획은 "Drive에 그대로 둠". 함께 휴지통으로 보내는 선택지가 필요한지?

## 6. 검증

- `npx eslint` · `npx tsc --noEmit`
- 개발 서버에서: 상세에서 할 일 추가 → 목록 · Inbox 둘 다 나타남(배지 = 이 컨테이너), 한글 입력 후 Enter 한 번에 한 개만 추가,
  연속 입력. 삭제: 연결만 끊기 → 할 일은 Inbox · 캘린더에 남고 배지 사라짐, 스크랩은 Inbox로. 함께 삭제 → 할 일 · 하위 ·
  회고까지 사라짐. 프로젝트 회고 삭제 확인. 두 번째 탭에서 같은 컨테이너 보고 있다가 삭제되면 빈 상태로 바뀜. 모바일 폭.
- 실제 Supabase(RLS · Realtime)에서 한 번 확인 — 로컬에서 못 하면 그 사실을 인계 노트에 적는다.

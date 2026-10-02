# PARA 삭제 · 상세에서 할 일 추가 계획

작성 2026-09-28. 기존 문서(PLANNING / HANDOFF / DESIGN / FEATURES)는 건드리지 않고 이 파일에만 적습니다.
연결 시안: https://claude.ai/artifact/EWAVSDna7Zty2FzGLD2Azb
(① 할 일 탭에서 바로 추가 · ② ··· 메뉴 · ③ 삭제 확인 · ④ 모바일 할 일 탭 · ⑤ 모바일 삭제 확인)

**상태: 구현 완료(2026-09-29).** 확인 범위는 HANDOFF.md 31번. 시안 2차에서 사용자 피드백(2026-09-28) 반영:
추가 줄은 목록 **맨 위** · 삭제 기본값은 **함께 삭제(Drive 폴더는 휴지통으로)** · 삭제 입구는 **상세 화면에만**.

## 1. 무엇을 왜

1. **PARA를 지울 수 없다.** 한 번 만든 Project · Area · Resource가 영원히 남는다. 잘못 만들었거나 더 필요 없는 것도
   "완료/보관"으로 흐리게 두는 것밖에 없다.
2. **PARA 상세에서 할 일을 만들 수 없다.** 프로젝트를 보면서 할 일이 떠올라도 Inbox에 적은 뒤 PARA를 고르거나
   끌어다 놓아야 한다.

> 참고: 데이터 쪽은 대부분 준비돼 있다. `removeProject` · `removeArea` · `removeResource`(`lib/supabase/containers.ts`)와
> `addTodo(content, position, mapping)`의 PARA 매핑 인자(`lib/supabase/todos.ts`)는 있는데, 화면에서 부르는 곳이 없을 뿐이다.

## 2. 합의한 규칙 (시안 기준 — 바뀌면 여기부터 고친다)

### 2-1. 상세 화면에서 할 일 추가

| 항목 | 규칙 |
|---|---|
| 위치 | 할 일 탭 "할 일" 목록 카드 **맨 위 줄**(`+ 새 할 일`). 줄을 누르면 바로 입력 |
| 입력 | Enter로 추가하고 입력칸은 비운 채 그대로 → 연속 입력. 한글 조합 중 Enter는 무시(`isComposing`). Esc는 입력 취소 |
| 만들어지는 것 | `kind = 'task'`, 이 컨테이너에 매핑(`projectId`/`areaId`/`resourceId` 중 하나), 날짜 없음 |
| Inbox | 날짜가 없는 할 일이라 **Inbox에도 보인다**(기존 규칙 `isInboxVisible` 그대로, 소속 배지 표시). Inbox 맨 끝 순서(`nextPosition(backlogItems)`) |
| 목록 순서 | 미완료 → 완료. **미완료 안에서는 최근에 만든 것이 위** — 맨 위에서 추가한 할 일이 입력줄 바로 아래에 나타나야 해서 (지금은 만든 순서 오름차순이라 이 부분이 바뀜). 완료 그룹은 지금 그대로 |
| 방금 추가한 표시 | 시안처럼 추가 직후 한 줄을 옅은 파란 배경 + "방금 추가 · Inbox에도 보여요"로 잠깐 표시(화면을 떠나면 사라짐, 저장 안 함) |
| 안내 문구 | 기존 "Inbox에서 끌어다 놓으면 연결돼요" 문구는 카드 아래 작은 캡션으로: "여기서 만든 할 일은 날짜가 정해질 때까지 Inbox에도 보여요 · Inbox에서 끌어다 놓아도 연결돼요" |
| 노트(스크랩) | **1차 범위 밖.** 스크랩 섹션에는 추가 줄을 넣지 않는다 |

### 2-2. PARA 삭제

| 항목 | 규칙 |
|---|---|
| 들어가는 곳 | **PARA 상세 화면에만.** 이름 오른쪽 `···` 버튼 → 메뉴(macOS 메뉴 스타일). 목록 카드에는 넣지 않는다 |
| 메뉴 항목 | 이름 바꾸기 · 완료로 표시(Area/Resource는 "보관하기") · 구분선 · **○○ 삭제…**(빨강). 이름 · 상태는 지금도 눌러서 바꿀 수 있지만 메뉴에도 모아 둔다 |
| 확인 | 항상 확인 모달(`createPortal`). 앱에서 지운 항목은 되돌릴 수 없다 → 모달에 명시 |
| 연결된 할 일 · 노트 | 모달에서 고른다. **기본값 = 함께 삭제**: 매핑된 할 일 · 노트를 전부 지운다(하위 할 일 · 할 일 회고도 DB cascade로 같이) + Drive 폴더를 **Drive 휴지통으로 이동**. **연결만 끊기**: 할 일은 캘린더 · Inbox에 그대로(소속만 비움), 스크랩은 매핑이 풀리면서 Inbox로 돌아오고, Drive 폴더도 그대로 둔다 |
| 버튼 문구 | 함께 삭제 → "모두 삭제", 연결만 끊기 → "프로젝트만 삭제"(Area/Resource는 "영역만 삭제" · "리소스만 삭제") |
| 연결된 게 없으면 | 선택지를 숨기고 바로 "삭제". Drive 폴더가 있으면 휴지통으로 옮긴다는 안내만 |
| 프로젝트 회고 | 프로젝트에 직접 붙은 회고(`todo_reflections.project_id`)는 어느 쪽이든 **함께 삭제**(DB `on delete cascade`, 이미 그렇게 돼 있음). 모달에 개수 표시 |
| Google Drive 폴더 | 함께 삭제일 때만 **휴지통으로 이동**(`trashed = true`, 완전 삭제 아님 → 30일 안에 Drive에서 복구 가능). 폴더가 없거나(`driveFolderId = null`) Drive 미연결이면 건너뛴다 |
| 대안 안내 | 모달 안에 "지우지 않고 치워두고 싶다면 → 대신 완료로 표시(보관하기)" 버튼 |
| 삭제 후 | `/para?kind=<종류>` 목록으로 이동 |
| 다른 기기에서 삭제됨 | 상세 화면을 보고 있던 컨테이너가 Realtime DELETE로 사라지면 지금은 "불러오는 중..."에 멈춘다 → 로딩이 끝났는데 없으면 "삭제된 ○○이에요 · 목록으로" 빈 상태를 보여준다 |

## 3. 데이터

**DB 마이그레이션 없음.** 필요한 제약은 이미 있다:

- `todos.project_id / area_id / resource_id` → `on delete set null` (연결만 끊기)
- `todo_reflections.project_id` → `on delete cascade` (프로젝트 회고 삭제)
- `todo_subtasks.todo_id`, `todo_reflections.todo_id` → `on delete cascade` (할 일을 지우면 하위 · 회고도)

"함께 삭제"는 한 번에 처리하는 서버 트랜잭션이 없으니 순서로 보장한다:

1. **Drive 폴더 휴지통** (폴더가 있을 때만) — 실패하면 여기서 멈추고 모달에 오류 + [다시 시도] / [Drive 폴더는 두고 삭제].
   Drive를 먼저 하는 이유: DB를 먼저 지우면 `driveFolderId`를 잃어서 나중에 폴더를 찾을 수 없다.
2. `todos`에서 `<kind>_id = id`인 행 삭제.
3. 컨테이너 행 삭제.

2가 실패하면 3을 하지 않는다(할 일이 남은 채 컨테이너만 사라지는 것보다 둘 다 남는 게 안전). 1은 이미 됐어도 Drive
휴지통에서 복구할 수 있으니 괜찮다.

### Drive 휴지통 API (새로 만듦)

- `lib/google-drive.ts`: `trashFile(refreshToken, fileId)` — `files.update { trashed: true }`.
- `app/api/drive/folder/route.ts`에 `DELETE` 추가 — 본문은 `{ kind, containerId }`만 받는다. **폴더 id를 클라이언트에서
  받지 않고** 서버가 RLS 걸린 Supabase로 그 컨테이너의 `drive_folder_id`를 직접 조회해서 휴지통에 넣는다
  (남의 폴더 id를 넘겨 지우는 것 방지). 토큰 만료(`invalid_grant`)는 기존 `POST`처럼 토큰 정리 + 409.
- 앱이 만든 폴더라 지금 OAuth 범위로 충분한지 구현 때 확인한다(`/api/auth/google`의 scope).

## 4. 구현 순서

1. **데이터 훅**
   - `lib/supabase/todos.ts`: `removeTodosMappedTo(kind, id)` — 로컬에서 먼저 빼고 `delete().eq('<kind>_id', id)`.
     `clearMappingTo(kind, id)` — 로컬에서 해당 매핑만 `null`로(DB는 FK가 처리, Realtime UPDATE가 늦게 와도 화면은 바로 반영).
   - `lib/supabase/reflections.ts`: `dropReflectionsOfProject(projectId)` (로컬만, DB는 cascade).
   - 지운 할 일들의 하위 · 회고는 기존 `dropSubtasksOf` · `dropReflectionsOfTodo` 반복.
   - `lib/app-data/`에 `useContainerActions()` 추가 — `removeContainer(kind, id, { withItems, trashDriveFolder })` 하나로
     3번의 순서를 지킨다. 화면은 이것만 쓴다(할 일의 `useTodoActions`와 같은 방식).
   - `useTodoActions()`에 `addToContainer(content, kind, id)` 추가 — `addTodo(content, nextPosition(backlogItems), { <kind>Id: id })`.
2. **Drive 휴지통 API** — 3번 "Drive 휴지통 API".
3. **할 일 추가 줄** — `components/para/add-mapped-todo-row.tsx`(새 파일). `AddTodoForm`과 같은 입력 동작(Enter · 조합 안전)이지만
   카드 안 한 줄 모양. `container-detail-screen.tsx` 할 일 카드 **맨 위**에 넣고, 미완료 정렬을 최신순으로 바꾸고,
   기존 안내 문구를 캡션으로 옮김.
4. **··· 메뉴** — `components/para/container-menu.tsx`(새 파일). 기존 드롭다운(`ReflectionKindSelect` · 보기 드롭다운)과 같은
   macOS 메뉴 스타일, `useDismiss`로 바깥 클릭 · Esc 닫기. 이름 바꾸기는 기존 `startEditingName` 재사용.
5. **삭제 확인 모달** — `components/para/delete-container-dialog.tsx`(새 파일). `createPortal(…, document.body)`,
   라디오 2개(함께 삭제 — 기본 / 연결만 끊기), 개수(할 일 · 스크랩 · 프로젝트 회고)는 이미 계산된 `mappedTasks` ·
   `mappedNotes` · `reflectionsOfProject`에서. 진행 중엔 버튼 "삭제 중…" + 비활성. 확인 → `removeContainer` →
   `router.replace('/para?kind=…')`.
6. **삭제된 컨테이너 빈 상태** — `container-detail-screen.tsx`에서 로딩이 끝났는데 `container`가 없으면 안내.
7. **문서** — FEATURES.md(PARA 상세 표에 추가/삭제 행), HANDOFF.md 작업 이력, DESIGN.md 6번 "PARA 상세"에 `···` 메뉴 · 추가 줄 한 줄씩.

ESLint 규칙(화면은 `components/shell/*` import 금지)과 충돌 없음 — 전부 화면 쪽 컴포넌트.

## 5. 확정

- "(휴지통으로 이동)" = **Google Drive 폴더를 Drive 휴지통으로** (사용자 확인 2026-09-29). 앱 안 휴지통은 만들지 않는다.

## 6. 검증

- `npx eslint` · `npx tsc --noEmit`
- 개발 서버에서: 상세에서 할 일 추가 → 입력줄 바로 아래에 나타나고 Inbox에도 보임(배지 = 이 컨테이너), 한글 입력 후
  Enter 한 번에 한 개만 추가, 연속 입력. 삭제: 기본(함께 삭제) → 할 일 · 하위 · 회고 · 스크랩 사라지고 Drive 폴더가
  휴지통에 있음. 연결만 끊기 → 할 일은 Inbox · 캘린더에 남고 배지 사라짐, 스크랩은 Inbox로, Drive 폴더 그대로.
  Drive 미연결 · 폴더 없음 · Drive 실패(다시 시도 / 두고 삭제) 각각. 두 번째 탭에서 같은 컨테이너 보고 있다가 삭제되면
  빈 상태로 바뀜. 모바일 폭.
- 실제 Supabase(RLS · Realtime) · Drive에서 한 번 확인 — 못 하면 그 사실을 인계 노트에 적는다.

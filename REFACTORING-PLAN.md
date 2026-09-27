# 리팩토링 플랜 — 공통 앱 셸 (사이드바/레일 · Inbox 단일화)

작성 2026-09-27. 기존 문서(PLANNING / HANDOFF / DESIGN / FEATURES)는 건드리지 않고 이 파일에만 적습니다.
연결 시안: https://claude.ai/artifact/EAnz3ttkMqj676NhTXjP7b (v2, 보드 ①–⑧)

## 1. 원칙 (사용자 요구사항)

- **레일(내비게이션) · Inbox 패널 · 계정/Drive 메뉴는 앱 전체에 하나만 존재한다.** 화면이 바뀌어도
  언마운트되지 않고, 화면별로 다시 그리거나 화면이 파라미터를 넘겨서 모양/동작을 바꿀 수 없어야 한다.
- 화면(캘린더 · PARA 목록 · PARA 상세)은 **오른쪽 본문만** 책임진다.
- 이 원칙을 코드 구조(레이아웃)와 린트 규칙으로 강제해서, 앞으로 새 화면을 만들 때도 어길 수 없게 한다.

## 2. 현재 코드 진단 — 왜 리팩토링이 필요한가

`AppSidebar`는 "공용 컴포넌트"이긴 하지만 실제로는 **화면마다 따로 마운트되고, 화면이 props로 조립**합니다.

| 문제 | 근거 |
|---|---|
| 화면 3곳이 각자 `<AppSidebar>` + `<AppNavRail>`를 렌더링 | `week-board.tsx`, `para-board.tsx`, `para/container-detail-screen.tsx` |
| 사이드바 props가 약 20개 — 화면마다 조립 | `userEmail`, `googleConnected`, `onSignOut`, `panelOpen`, `items`, `projects/areas/resources`, `onToggle/onRemove/onEdit/onMemoEdit/onUrlEdit/onAssignPara/onConvert/onAdd`, `getBadge` … |
| **실제로 화면마다 다르게 보임** | `getBadge`를 PARA 화면만 넘김 → 캘린더에선 카테고리 점, PARA에선 이름 배지 |
| **실제로 화면마다 다르게 동작함** | `onAdd`/`onToggle` 구현이 화면마다 따로(상세 화면은 인라인 람다) |
| 같은 핸들러 3벌 복붙 | `handleSignOut`, `handleConvert`, `handleAssignPara`, 보관함 `backlogItems` 계산, DnD `sensors` |
| 레일 열림 상태가 화면마다 따로 | 각 화면 `useState(panelOpen)` → 화면 이동 시 Inbox가 항상 닫힘 |
| 내비게이션 컴포넌트가 2개 | 데스크톱 `AppSidebar` 안 버튼 + 모바일 `AppNavRail`/`IconRail` |
| 데이터 구독 중복 | 화면마다 `useSupabaseTodos/Projects/Areas/Resources`를 새로 호출 → 이동할 때마다 재조회 · Realtime 재구독 |
| 서버 조회 중복 | `app/page.tsx`, `app/para/page.tsx`, `app/para/[kind]/[id]/page.tsx`가 각각 user + `isGoogleConnected` 조회 |
| DnD 컨텍스트가 화면마다 따로 | `DndContext` · `SortableContext(BACKLOG)` · `DragOverlay` · `handleDragEnd`가 3벌 |
| Drive 연결 결과 알림이 PARA 목록에만 | `para-board.tsx`의 `googleStatus` 배너 (다른 화면으로 돌아오면 안 보임) |

## 3. 목표 구조

```
src/app/
  login/page.tsx                  ← 셸 없음 (그대로)
  (app)/                          ← 라우트 그룹: 로그인 후 화면 전부
    layout.tsx                    ← 서버: user · googleConnected 1회 조회 → <AppShell>
    page.tsx                      ← 캘린더 본문만
    para/page.tsx                 ← PARA 목록 본문만
    para/[kind]/[id]/page.tsx     ← PARA 상세 본문만

src/components/shell/             ← 셸 전용. 화면에서 import 금지
  app-shell.tsx                   ← Provider 조립 + 레이아웃(레일 | Inbox | main)
  app-rail.tsx                    ← 데스크톱 왼쪽 레일 / 모바일 하단 탭바 (한 컴포넌트, 반응형)
  inbox-panel.tsx                 ← 데스크톱 밀어내기 패널 / 모바일 바텀시트 (한 컴포넌트)
  account-menu.tsx                ← 아바타 팝오버: 이메일 · Drive 연결/재연결 · 로그아웃
  drive-status-toast.tsx          ← ?google= 결과 알림 (어느 화면이든)
  shell-ui-context.tsx            ← inboxOpen, addKind 등 셸 UI 상태

src/lib/app-data/                 ← 데이터 단일 출처
  app-data-provider.tsx           ← todos / projects / areas / resources 구독 1회
  use-todos.ts, use-containers.ts ← 화면·셸 공용 훅 (props 대신 사용)
  todo-actions.ts                 ← toggle / edit / convert / assignPara / add / remove … 단일 구현

src/lib/dnd/
  dnd-provider.tsx                ← DndContext · sensors · DragOverlay 1개
  drop-targets.ts                 ← droppable `data` 타입 정의
  handle-drop.ts                  ← 드롭 처리 단일 함수 (data.type으로 분기)
```

### 3-1. 셸은 props를 받지 않는다

`<AppShell user={...} googleConnected={...}>{children}</AppShell>` — 서버 레이아웃이 넘기는 이 두 값이
전부입니다. 화면은 셸에 아무것도 넘기지 않고, 셸 쪽 컴포넌트(`AppRail`, `InboxPanel`, `AccountMenu`)는
**props 없이** Context/URL에서 필요한 걸 스스로 읽습니다 (활성 메뉴 = `usePathname()`).

### 3-2. 드래그 앤 드롭: 화면이 핸들러를 넘기지 않고 "드롭 대상 데이터"만 선언

지금은 화면마다 `handleDragEnd`가 드롭 id 문자열(`grid:mon`, `project:<id>` …)을 파싱합니다.
바꾼 뒤에는 각 드롭 영역이 `useDroppable({ id, data })`로 **무엇인지 데이터로 선언**하고,
처리는 `handle-drop.ts` 한 곳에서 합니다.

| `data.type` | 선언하는 곳 | 처리 |
|---|---|---|
| `inbox` | `InboxPanel` (셸) | 날짜 해제 또는 보관함 순서 변경 |
| `calendar-day` + `date` | 주간 캘린더 칸 | `date` + 포인터 위치 → 시작 시간(15분 스냅) |
| `para-container` + `kind`, `id` | PARA 카드, PARA 상세 화면 | 매핑 |

지금 `grid:<dayKey>` → `dayDateKey(monday, …)`처럼 화면 state(`monday`)에 기대던 계산은
droppable `data.date`에 실제 날짜를 넣어서 없앱니다. 겹침 우선순위는 기존
`preferSpecificTargetCollision`을 그대로 씁니다(HANDOFF 12번).

### 3-3. 미니 캘린더 — 애플 캘린더 방식 (시안 ③)

캘린더 화면 툴바의 **"2026년 9월 ⌄" 제목 버튼 → 미니 캘린더 팝오버**. 보고 있는 주는 줄 전체가
연한 파란 띠, 오늘은 빨간 원, 날짜 클릭 → 그 주, 팝오버 안 월 라벨 클릭 → 월 보기.
이건 캘린더 본문의 일부(툴바)라서 셸이 아니라 `calendar-header.tsx`에 둡니다. 기존
`mini-calendar.tsx`의 날짜 계산/URL 이동 로직은 재사용.

### 3-4. 계정 · Google Drive (시안 ⑤⑥)

레일 하단 아바타 → `AccountMenu` 팝오버: 이메일, Drive 상태(연결됨 + 재연결 / 미연결 + 연결),
로그아웃. Drive 미연결이면 아바타에 주황 점. 링크는 기존 `/api/auth/google` 그대로.
OAuth 콜백이 돌려주는 `?google=` 결과는 `DriveStatusToast`가 어느 화면에서든 표시하고 쿼리를 지웁니다.

## 4. 재발 방지 장치

1. **ESLint `no-restricted-imports`**: `src/app/(app)/**`와 화면 컴포넌트에서
   `@/components/shell/*` import 금지 (`app/(app)/layout.tsx`만 예외).
2. 셸 컴포넌트는 props 타입을 두지 않는다(`AppShell`의 `user`/`googleConnected`/`children` 제외) —
   리뷰 체크 항목.
3. 검증 명령: `rg "<AppSidebar|<AppRail|<InboxPanel|<AccountMenu" src` 결과가 `components/shell/`
   안에서만 나와야 함.
4. DESIGN.md 5번(레이아웃) 섹션은 리팩토링이 끝난 뒤 이 구조로 갱신 — 지금은 수정하지 않음.

## 5. 파일 변경 요약

| 구분 | 파일 |
|---|---|
| 새로 | `app/(app)/layout.tsx`, `components/shell/*`, `lib/app-data/*`, `lib/dnd/dnd-provider.tsx`, `lib/dnd/drop-targets.ts`, `lib/dnd/handle-drop.ts`, `components/calendar-header.tsx` |
| 이동 | `app/page.tsx`, `app/para/**` → `app/(app)/…` (URL은 그대로) |
| 대폭 축소 | `week-board.tsx`, `para-board.tsx`, `para/container-detail-screen.tsx` — 셸/데이터/DnD 코드 제거, 본문만 |
| 삭제 | `app-sidebar.tsx`, `app-nav-rail.tsx`, `icon-rail.tsx`, `week-nav.tsx`(→ `calendar-header`) |
| 유지 | `todo-card.tsx`, `calendar-block.tsx`, `todo-detail-modal.tsx`, `month-calendar.tsx`, `lib/dnd.ts`의 collision 함수, API 라우트 전부 |

## 6. 진행 단계

**구조 먼저, 디자인은 나중에.** 1–5단계는 지금 모양을 그대로 둔 채 구조만 바꿔서, 문제가 생기면
"구조 탓인지 디자인 탓인지"를 나눠 볼 수 있게 합니다. 단계마다 `tsc --noEmit` · `eslint` ·
`next build`가 통과한 상태로 커밋합니다.

0. **준비** — `npm install` 후 `node_modules/next/dist/docs/`에서 레이아웃 · 라우트 그룹 ·
   `useSearchParams`의 Suspense 요구사항 문서를 읽고 확인(Next 16.3, AGENTS.md 지시).
   `src/proxy.ts`의 로그인 리다이렉트가 새 경로에서도 그대로 동작하는지 확인.
1. **데이터 단일화** — `AppDataProvider` + `useTodos()`/`useContainers()` + `todo-actions.ts`.
   세 화면이 props 대신 이 훅을 쓰도록 교체. 화면 모습 변화 없음.
2. **라우트 그룹 + 공통 레이아웃** — `(app)/layout.tsx`로 user · `googleConnected` 조회를 한 번으로.
   각 `page.tsx`는 본문 컴포넌트만 렌더링.
3. **DnD 단일화** — `DndProvider` + droppable `data` + `handle-drop.ts`. 캘린더 칸 · PARA 카드 ·
   PARA 상세 · Inbox 네 드롭 대상 이전. 세 화면의 `DndContext`/`handleDragEnd` 제거.
4. **셸 이전(현재 디자인 유지)** — 기존 `AppSidebar` 마크업을 `components/shell/`로 옮겨 레이아웃에서
   한 번만 렌더링하고, 화면 쪽 `<AppSidebar>`/`<AppNavRail>` 제거. props 제거 과정에서 배지 규칙을
   하나로 통일(항상 "점 + 소속 이름", 시안 ②와 동일).
5. **회귀 점검** — FEATURES.md 표(A·N·I·W·M·D·P·C)를 하나씩 손으로 확인.
6. **새 디자인 적용(시안 컨펌 후)** — `AppRail` + 밀어내기 `InboxPanel` + `AccountMenu`,
   `calendar-header`(제목 → 미니 캘린더 팝오버, 월/주 드롭다운), 일정 블록 체크박스, 팔레트 토큰
   교체, 모바일 하단 탭 · 바텀시트 새 스타일. 끝나면 DESIGN.md / HANDOFF.md 갱신.

## 7. 사용자에게 보이는 동작 변화

| 변화 | 이전 | 이후 |
|---|---|---|
| Inbox 열림 상태 | 화면 이동하면 닫힘 | 화면을 옮겨도 유지 |
| Inbox 항목 표시 | 캘린더: 점 / PARA: 이름 배지 | 모든 화면 같은 모양 |
| 화면 이동 속도 | 이동마다 데이터 재조회 | 이미 불러온 데이터 재사용 |
| Drive 연결 결과 알림 | PARA 목록에서만 | 어느 화면이든 |
| 미니 캘린더 | 모든 화면 사이드바 | 캘린더 화면 제목 팝오버 (PARA에서는 레일의 캘린더 → 제목) |
| 레일 · Inbox 위치 | 모바일 하단 / 데스크톱 왼쪽 | 동일 (6단계에서 새 스타일) |

## 8. 리스크 · 확인할 점

- **레이아웃의 인증 확인**: 레이아웃은 클라이언트 이동 때 다시 실행되지 않음. 로그인 보호는 지금처럼
  `proxy.ts`가 담당하므로 문제없지만, 0단계에서 확인.
- **`useSearchParams`를 셸에서 쓰면** Suspense 경계가 필요할 수 있음 — 0단계 문서 확인 후 결정.
- **DragOverlay가 셸에 하나** — 드래그 중인 항목이 캘린더 블록인지 Inbox 카드인지에 따라 오버레이
  모양을 고르는 로직(`week-board.tsx`에 있던 것)을 `DndProvider`로 이동.
- **캘린더 칸 드롭 시간 계산**은 지금 `over.rect.top`과 드래그 항목 위치로 계산 — 로직 그대로 옮기되
  `monday` 대신 `data.date` 사용.
- **Realtime 채널 이름**(`todos-${userId}` 등)은 구독이 1회가 되므로 그대로 유지 가능.
- 이 세션 환경에는 Supabase 키가 없어 브라우저 실동작 확인이 안 됨(HANDOFF 11번과 동일) — 5단계
  회귀 점검은 로컬에서 필요.

## 진행 상황

- [x] 0단계 준비 — Next 16.3 문서(Context providers, Route Groups) 확인
- [x] 1단계 데이터 단일화 — `src/lib/app-data/` (`AppDataProvider`, `useTodos`, `useContainers`, `useTodoActions`).
  세 화면의 복붙 핸들러 · Inbox 계산 · 이름 조회를 제거. Provider는 임시로 각 `page.tsx`에서 감싸고 있고,
  2단계에서 `(app)/layout.tsx`로 올라가면 화면 이동 시 재조회도 없어진다. 화면 모습 · 동작 변화 없음.
- [x] 2단계 라우트 그룹 + 공통 레이아웃 — `src/app/(app)/layout.tsx`가 사용자 · Drive 연결 여부를 한 번 조회하고
  `AppDataProvider`를 한 번만 마운트. 세 `page.tsx`는 본문 컴포넌트만 렌더링(URL은 그대로). 화면은
  `userEmail`/`googleConnected`를 props 대신 `useSession()`으로 읽음 → 화면 이동 시 재조회 · 재구독 없음.
- [x] 3단계 DnD 단일화 — `src/lib/dnd/` (`DndProvider`를 `(app)/layout.tsx`에 한 번, `handle-drop.ts` 단일 처리,
  `drop-targets.ts` 데이터 타입, `collision.ts`는 기존 `lib/dnd.ts` 이동). 드롭 영역은 `data`로 자신을 선언
  (Inbox · 캘린더 하루 칸(실제 날짜) · PARA 카드/상세), 끄는 카드는 출처(`inbox`/`container`/`calendar`)를 선언.
  보관함 `SortableContext`는 `AppSidebar` 안으로 이동. 세 화면의 DndContext · sensors · DragOverlay · handleDragEnd 제거.
  동작 변화 1건: PARA 화면에서 이미 매핑된 Inbox 항목을 Inbox 안에서 끌면 예전엔 매핑이 풀렸는데, 이제 캘린더
  화면과 똑같이 순서만 바뀜(매핑 해제는 상세 화면 목록 → Inbox 드래그 또는 상세 팝업의 "없음").
- [ ] 4단계 셸 이전
- [ ] 5단계 회귀 점검
- [ ] 6단계 새 디자인 적용

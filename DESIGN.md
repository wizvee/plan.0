# 디자인 가이드 (DESIGN)

이 문서는 **2026-09-27 애플 스타일 리디자인**(Claude Design 캔버스 목업 → 컨펌 → 공통 셸 리팩토링 → 코드 반영)에서
정한 디자인 맥락을 정리한 문서입니다. 새 세션에서 화면/컴포넌트를 추가하거나 수정할 때는 **이 문서를 먼저 읽고
아래 방향을 그대로 따라주세요.** 개념/기능 기획은 [PLANNING.md](./PLANNING.md), 작업 이력은
[HANDOFF.md](./HANDOFF.md), 현재 기능 목록은 [FEATURES.md](./FEATURES.md), 셸 구조를 바꾼 이유는
[REFACTORING-PLAN.md](./REFACTORING-PLAN.md) 참고.

> 원본 목업(Claude Design 캔버스): https://claude.ai/artifact/EAnz3ttkMqj676NhTXjP7b
> 주 보기 · Inbox 열림 · 미니 캘린더 · 월 보기 드롭다운 · 계정 메뉴(Drive 연결/미연결) · PARA 목록 ·
> PARA 상세(Project/Area/Resource 각 탭) · 팔레트 보드가 있습니다. 큰 레이아웃을 다시 논의할 일이 있으면 여기서 먼저
> 시안을 그려보고 컨펌받은 뒤 코드로 옮기세요(HANDOFF.md의 "UI는 코드로 바로 만들지 않는다" 규칙).
>
> 이전 디자인(2026-09 미니멀 캘린더형, 260px 사이드바 · 웜 크림 팔레트)은 커밋 `a7072f5` 기준 이 문서의 이전 버전 참고.

## 1. 방향

**애플 캘린더 / 미리알림 스타일** — 참고 레퍼런스는 macOS·iOS 캘린더와 사용자가 준 캘린더 앱 스크린샷.
이전 버전 대비:

- 왼쪽 260px 사이드바 → **76px 아이콘 레일**(캘린더 · PARA · Inbox · 계정) + **밀어내는 Inbox 패널**
- Inbox는 팝업이 아니라 레일 옆에 열리면서 **본문을 오른쪽으로 밀어냄** — 월요일 등 본문 왼쪽을 절대 가리지 않는다
- 월/주 전환은 캘린더 오른쪽 상단 **보기 드롭다운**, 미니 캘린더는 **제목("2026년 9월 ⌄")을 누르면 뜨는 팝오버**(애플 캘린더 방식)
- 팔레트를 웜 크림 + 블루그레이 → **뉴트럴 그레이 + 시스템 블루**로. "오늘"과 현재 시각은 애플처럼 **빨강**
- 목록은 iOS 설정 앱 같은 **흰 카드 안 헤어라인 구분 리스트**, 전환 컨트롤은 **세그먼트 컨트롤**

## 2. 컬러 토큰

모두 `src/app/globals.css`의 CSS 변수. `@theme inline`에서 Tailwind 유틸리티(`bg-primary`, `text-today` 등)로
매핑되어 있으니, **컴포넌트에서는 항상 시맨틱 토큰으로 참조하고 새 hex 값을 직접 쓰지 마세요.**
중립 틴트가 필요하면 `bg-black/[0.06]`처럼 검정의 투명도로 쓰는 건 괜찮습니다(애플 방식, 새 색이 아님).

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#1C1C1E` | 본문 배경 |
| `--foreground` | `#1D1D1F` | `#F5F5F7` | 기본 텍스트 |
| `--card` / `--popover` | `#FFFFFF` | `#2C2C2E` | 카드 · 리스트 · 팝오버 |
| `--primary` | `#0071E3` | `#0A84FF` | 액센트, 선택 상태, 주요 버튼, Project 카테고리 |
| `--secondary` / `--muted` | `#F5F5F7` | `#2C2C2E` | 레일 배경, 요약 줄 · 빈 상태 배경 |
| `--panel` | `#FBFBFD` | `#232325` | Inbox 패널 배경 |
| `--muted-foreground` | `#6E6E73` | `#98989D` | 보조 텍스트(흰 배경 4.9:1) |
| `--accent` | `#E8F1FE` | `#10304F` | primary 틴트 (Project 카테고리 배경으로도 재사용) |
| `--accent-foreground` | `#0A4A9E` | `#64A8FF` | accent 위 텍스트 |
| `--destructive` | `#FF3B30` | `#FF453A` | 삭제, 오류 |
| `--today` | `#FF3B30` | `#FF453A` | 오늘 날짜 원 · 현재 시각 선 · Inbox 개수 배지 |
| `--warning` | `#FF9500` | `#FF9F0A` | Drive 미연결 경고 점 등 |
| `--border` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.12)` | 헤어라인 |
| `--category-area` / `-tint` | `#2E9E5B` / `#E5F5EB` | `#30D158` / `#173A24` | Area 카테고리 |
| `--category-resource` / `-tint` | `#A550D6` / `#F4EAFB` | `#BF5AF2` / `#34203F` | Resource 카테고리 |
| `--mark-question` / `-tint` | `#9437C9` / `#EBD9F8` | `#BF5AF2` / `#43265A` | 메모 줄 표시 · 질문 (18px 칸에 맞춰 진하게) |
| `--mark-info` / `-tint` | `#58585D` / `rgba(0,0,0,.09)` | `#AEAEB2` / `rgba(255,255,255,.14)` | 메모 줄 표시 · 알게 된 것 |
| `--mark-keep` · `--mark-problem` · `--mark-try` / `-tint` | `#22884B` · `#B35F00` · `#0068D6` / `#D3EEDD` · `#FFE6C2` · `#D6E7FD` | `#30D158` · `#FF9F0A` · `#0A84FF` / `#1C4A2D` · `#4D3410` · `#143C66` | 메모 줄 표시 · 회고 — 잘한 점 / 아쉬운 점 / 다음엔 (2026-09-30 `--retro-*`를 합침) |

**Project 카테고리는 별도 토큰이 없습니다** — `--primary`/`--accent`를 그대로 재사용합니다.
새 카테고리 색이 필요하면 애플 시스템 컬러 계열에서 고르고, 틴트는 라이트 `L≈94%`, 다크 `L≈25%` 정도로 파생하세요.
(앱에 다크 모드를 실제로 켜는 로직은 아직 없음 — 토큰만 준비돼 있음.)

## 3. 색 = 영역(컨텍스트) — 2026-10-01부터

**할 일 · PARA · 주간 목표의 색은 그 영역(컨텍스트)의 색입니다.** PARA 종류(Project / Area / Resource)는 색이 아니라 탭 · 그룹 순서 ·
아이콘(`Target` · `Compass` · `BookmarkSimple`)이 말합니다(시안 https://claude.ai/artifact/9V2Fz7bEfE3DhEqha5kyPg 컨펌, BALANCE-PLAN.md).
할 일은 매핑된 PARA의 컨텍스트, PARA가 없으면 기본(기타) 컨텍스트 색. 컨텍스트가 하나도 없으면(마이그레이션 전) 예전 회색.

`useParaColor()`(`src/lib/app-data/use-para-color.ts`)로 읽으세요 — `ofMapping(todo 또는 goal)` · `ofContainer(kind, id)` · `ofContextId(contextId)`가
`{ color, tint, context }`를 돌려줍니다. 색 이름 → CSS 변수는 `lib/context-color.ts`(`contextColor` · `contextTint`).
색을 `bg-blue-500`처럼 하드코딩하지 말고 `style={{ backgroundColor: tint }}` 형태로. PARA 종류별 색 상수(`CATEGORY_COLOR_VAR`)는 없앴습니다.

적용된 곳:
- `calendar-block.tsx` — 틴트 배경(모서리 4px) + 왼쪽 색 막대(위 · 아래 · 왼쪽 3px 띄운 3px 막대, 끝 살짝 둥글게 — 애플 캘린더 방식, `CategoryBar`) + 같은 색 작은 원형 체크. 완료되면 색은 유지하고 블록 전체를 50%로 흐리게.
- `month-calendar.tsx` — 일정 한 줄 = 영역 색 점 + 제목 + 시작 시각.
- `todo-card.tsx` — 소속 이름(`badge`) 앞에 영역 색 점. Inbox는 PARA별 그룹 머리(영역 색 점 + 이름)가 이름을 대신해 줄마다 붙이지 않는다. **그룹 머리는 점 그대로**(종류 아이콘으로 바꾸지 않음 — 사용자 결정).
- `container-card.tsx` — 모서리 4px 흰 카드 + 왼쪽 막대(완료 · 보관이면 회색), 상태 칩 배경, 진행률 바가 영역 색. 기본(기타)이 아닌 영역이면 이름 옆에 색 점 + 영역 이름 칩.
- PARA 상세 — 아이콘 타일(종류 아이콘 + 영역 틴트), 상태 칩, 진행률 바가 영역 색. PARA 목록 세그먼트의 종류 아이콘은 선택되면 primary.
- 할 일 상세 팝업 — PARA 줄 타일 · 체크가 영역 색, 라벨은 `프로젝트 · 생활`처럼 종류 + 영역 이름.
- PARA 고르기 메뉴(`ParaMenu`) · 검색 결과 · 주간 목표 카드 링 · 목표 연결 팝오버 · 나중에로 옮긴 할 일 목록 — 모두 영역 색 점.
- 하위 할 일 진행률 — 링 · 바 · 하위 체크박스는 할 일의 영역 색, 트랙은
  `color-mix(in srgb, <색> 16~20%, transparent)`. **`2/4` 숫자는 영역 색 대신 보조 텍스트 색**(작은 글씨라 초록 · 주황 등은 대비 부족).

## 4. Radius

`--radius: 0.625rem`(10px) 기준, `rounded-sm/md/lg/xl` = 6 / 8 / 10 / 14px. 실제로는 애플 수치를 그대로 쓰는 곳이 많습니다:

- 패널 · 카드 · 그룹 리스트 · 팝오버: `rounded-xl`(14px) 또는 `rounded-[10px]`~`rounded-[12px]`
- 버튼 · 입력창 · 세그먼트: `rounded-[7px]`~`rounded-lg`, 세그먼트 안 선택 조각은 `rounded-md`/`rounded-[5px]`
- 캘린더 블록 · PARA 목록 카드(+ 새로 만들기 점선 카드): `rounded-[4px]`(2026-09-29 애플 캘린더 스타일로 8 · 14 → 4px), 칩 · 태그: `rounded-[5px]`
- 체크박스 · 아바타 · 오늘 날짜 · 점 · 개수 배지는 **원형(`rounded-full`) 유지**
- `rounded-2xl`은 쓰지 마세요.

## 5. 레이아웃 — 공통 앱 셸 (가장 중요)

로그인 후 화면(캘린더 · PARA 목록 · PARA 상세)은 전부 `src/app/(app)/layout.tsx` 아래에 있고, 이 레이아웃이
**셸을 한 번만** 렌더링합니다. 셸은 화면을 옮겨도 언마운트되지 않습니다.

```
(app)/layout.tsx  → AppDataProvider → DndProvider → AppShell
AppShell          = [AppRail] [InboxPanel(열렸을 때)] [main: DriveStatusBanner + 화면 본문] + AccountMenu + ContextManager + SearchPanel
```

- **`AppRail`**(`components/shell/app-rail.tsx`) — 데스크톱은 왼쪽 76px 세로 레일, 모바일(`sm:` 미만)은 하단 탭바.
  한 컴포넌트가 반응형으로 모양만 바꿈. 항목: 목표(이번 주 진행률 링) · 캘린더 · PARA · 검색(⌘K) · Inbox(열기/닫기, 개수 배지) · 계정(아바타, Drive 미연결이면 주황 점).
  모바일 탭바는 6칸(2026-09-30 검색 시안 ⑦A).
- **`InboxPanel`** — 데스크톱은 레일 옆 320px 패널이 **본문을 밀어냄**(sticky, 팝업 아님), 모바일은 하단 탭 위 바텀시트.
  보관함 드롭 영역 · 보관함 카드의 `SortableContext`(PARA 그룹마다 하나)는 앱에 한 벌만 있어야 하므로 이 컴포넌트가 유일한 보관함입니다.
  열림 여부는 `localStorage`에 기억(`src/lib/shell-ui.tsx`). 항목은 PARA별 그룹(아래 6번 "Inbox PARA 그룹").
- **`AccountMenu`** — 이메일 · Google Drive 연결됨/재연결 또는 연결 · 로그아웃. Drive 링크는 지금 화면으로 돌아오도록 `next`를 붙임.
- **`DriveStatusBanner`** — OAuth 콜백의 `?google=` 결과를 어느 화면에서든 표시.
- **`SearchPanel`** — ⌘K / 레일 검색으로 여는 검색(아래 6번 "검색 패널"). 셸에 한 번만 마운트되고 body 포털로 뜬다.

**규칙 (ESLint로 강제됨):**
1. 화면(page · 화면 컴포넌트)은 `@/components/shell/*`을 import할 수 없습니다(`eslint.config.mjs`의 `no-restricted-imports`,
   `(app)/layout.tsx`만 예외). 새 화면은 `src/app/(app)/` 아래에 `page.tsx`를 만들고 **본문만** 그리세요 —
   사이드바/레일/Inbox를 직접 렌더링하거나 props로 조립하지 않습니다.
2. 셸 컴포넌트는 화면에서 props를 받지 않습니다. 데이터는 `useTodos()` · `useContainers()` · `useTodoActions()` ·
   `useSession()`(`src/lib/app-data/`), 현재 화면은 `usePathname()`으로 스스로 읽습니다.
3. 화면이 Inbox를 열어야 하면(예: 캘린더 툴바 "+") `useShellUI().openInboxForAdd()`(`src/lib/shell-ui.tsx`)만 씁니다. 검색은 `useShellUI().openSearch()`.
4. 드래그 앤 드롭은 `DndProvider` 하나. 새 드롭 영역은 `useDroppable({ id, data })`의 `data`(`src/lib/dnd/drop-targets.ts`)로
   "나는 무엇인지"만 선언하고, 처리는 `src/lib/dnd/handle-drop.ts` 한 곳에 추가하세요.
5. 캘린더 화면 상태(주/월, 보고 있는 주/달)는 URL 쿼리(`?week=` / `?view=month&month=`)가 유일한 출처입니다.

## 6. 화면별 패턴

- **캘린더 툴바**(`calendar-header.tsx`): 왼쪽 제목 버튼 → 미니 캘린더 팝오버(보는 주는 줄 전체 파란 띠, 오늘 빨간 원,
  날짜 → 그 주, 월 라벨 → 월 보기) · "39주 · 9월 21일 – 27일". 오른쪽 `+`(Inbox 열고 입력창 포커스) · 보기 드롭다운(주/월,
  체크 표시 메뉴) · `‹ 오늘 ›` 세그먼트.
- **주 보기**: 요일 머리글의 오늘은 빨간 원, 시간 라벨 "오전 9시 / 정오 / 오후 1시", 현재 시각 빨간 선, 주말 열은 아주 옅은 틴트.
- **겹치는 일정**(애플 캘린더 방식, 시안 https://claude.ai/artifact/1xV98C9TMFtRfJDWKgGJcg ④ — 2026-09-29 구글식 들여쓰기에서 바꿈):
  ① 화면에서 안 겹치면 **칸 전체 너비**(겹침은 그려진 높이로 판단 — 7:00–7:30 다음 7:30은 안 겹침). ② 겹쳐도 아래 블록의
  **제목 · 시간 줄(36px ≈ 40분)을 지나서** 시작하면 그 안쪽에 **쏙 얹기**(왼쪽 9px — 아래 블록의 색 막대만 보임 · 오른쪽 7px 안,
  흰 1px 테두리 + 틴트 4% 어둡게). ③ 그 안에서 시작하면(같은 시각 포함) **나란히 같은 너비로**(둘이면 50:50, 사이 2px).
  같은 시각에 시작한 긴 업무 블록은 하루 종일 반 폭이 된다(애플도 같음). 블록 사이는 3px(`BLOCK_GAP`), 최소 높이는 30분 칸(26px)이라
  30분 블록끼리 붙어도 틈이 보이고 30분 이하는 한 줄(시간 없음). 계산은 `lib/calendar-layout.ts`의 `layoutDayBlocks` · `blockHeightPx` 한 곳.
- **Inbox PARA 그룹**(INBOX-GROUPS-PLAN.md, 시안 https://claude.ai/artifact/NagRGwGtAevetvXLLSrr2p ① · ④): TickTick식 섹션 머리 —
  기본은 접힘(펼친 그룹만 기억). 34px 줄에 `CaretDown`(접으면 -90°) + 8px 영역 색 점(미분류는 회색 빈 원) + 13px 굵은 이름 + 오른쪽 개수(보조 텍스트). 흰 카드로 감싸지 않는다(B안 안 씀).
  미분류 맨 위 → P → A → R, 완료 · 보관은 맨 아래. 다른 그룹으로 끌 때 그 그룹 전체를 영역 틴트로(미분류는 `bg-black/[0.04]`),
  개수 자리에 "여기로 옮기기"(영역 색 75% + 검정 — 틴트 위 작은 글씨 대비), 펼친 그룹이면 끝에 영역 색 2px 선. 다른 그룹 카드는 비키지 않는다.
- **PARA 목록**: 제목 + 설명, 오른쪽 Project/Area/Resource 세그먼트, 카드 그리드. 카드는 완료 · 보관을 맨 뒤로 보내고, 그 안에서 시작일 순(이른 것 먼저, Area/Resource는 만든 날 순).
  Project 카드는 이름 아래 `9월 1일 – 10월 15일`(올해가 아니면 연도 붙임, 마감일이 없으면 `–` 뒤 공란).
- **PARA 상세**: `‹ Project` 뒤로가기(파란 텍스트), 카테고리 아이콘 타일 + 이름(클릭해서 수정), 회색 요약 줄
  (상태 · 마감일 또는 만든 날 · 진행률), 세그먼트 탭(개요 / 할 일 / 자료 / 회고 — 회고는 Project만), 흰 카드 그룹 리스트.
  개요 탭 맨 위는 "남은 것" 카드(열린 확인 · 질문, 검색 칩 목록과 같은 칩 · `MarkLineRow`, 흰 카드 안 할 일별 머리 줄 — 없으면 숨김), 그 아래 속성 카드.
  Drive 미연결이면 자료 탭은 연결 안내. 이름 오른쪽 끝 `···`(회색 원형 버튼) → 이름 바꾸기 · 상태 · 삭제 메뉴 — **삭제 입구는 여기뿐**
  (목록 카드에 넣지 않는다). 할 일 카드 맨 위 줄은 `+ 새 할 일` 입력(PARA-MANAGE-PLAN.md).
- **팝오버/메뉴**: 흰 반투명 + `backdrop-blur` + 큰 그림자, 메뉴 항목은 hover 시 primary 배경 · 흰 글자(macOS 메뉴).
- **모달**: `createPortal(…, document.body)`로 띄운다. Inbox 패널처럼 sticky인 조상 안에서 그리면 자체 쌓임 맥락에 갇혀
  캘린더의 z-index 요소가 모달 위로 올라온다(2026-09-28 버그).
- **하위 할 일 진행률**(SUBTASKS-PLAN.md): 하위가 0개면 아무것도 그리지 않는다. 목록 카드 = 13px 링 + `2/4`(`SubtaskProgress`),
  주 보기 블록 = 제목 옆 `2/4` + 바닥 3px 바 + 남는 높이만큼 하위 목록, 월 보기 = `2/4` 텍스트만, 상세 팝업 = `2/4 · %` + 4px 바 +
  체크리스트(`SubtaskList`). 체크리스트를 다른 곳에 넣을 때도 `SubtaskList`를 재사용하고 새로 만들지 않는다.
- **하위 할 일 넘김**(CARRY-OVER-PLAN.md): 넘긴 항목은 체크박스 대신 회색 원 안 `ArrowRight`, 취소선 없이 보조 텍스트 색
  (취소선 = 완료, 화살표 = 넘김). 주 보기 블록에선 작은 화살표. 진행률은 분모에만 넣는다(3/4).
  넘기기 버튼은 할 일이 끝나기 전엔 푸터 왼쪽 작은 회색 텍스트 버튼, 끝난 뒤엔 하위 할 일 탭 아래 accent 카드(때 맞춰 유도).
- **컨텍스트 색**(BALANCE-PLAN.md 4번, 시안 https://claude.ai/artifact/DfzCfv9eci2fj5k5F6mXXc ⑤ ⑥): 애플 시스템 컬러 8개 이름으로 저장
  (`lib/context-color.ts` — `contextColor(color)`, 파랑 · 초록 · 보라는 `--primary` · `--category-area` · `--category-resource` 재사용, 나머지는 `--ctx-*`).
  빨강 · 노랑은 없다. **2026-10-01부터 앱 전체의 색** — 캘린더 블록 · Inbox · PARA · 팝업 · 목표까지(위 3번).
  고른 색 = 흰 2px 틈 + 같은 색 2px 링. 수면 컨텍스트 칩 = 남색 틴트 + `Moon`.
- **자정을 넘는 블록**(BALANCE-PLAN.md 5번, 시안 https://claude.ai/artifact/DfzCfv9eci2fj5k5F6mXXc ③): 애플 캘린더처럼 두 날에 두 조각 —
  이어지는 쪽은 모서리 각지게 + 색 막대도 끝까지. 두 조각 모두 제목 · 시간(`오후 11:45 - 오전 7:15`) · 체크박스, 크기 조절 손잡이는 끝이 있는
  다음 날 조각에만(아침에 기상 시간 고치는 곳). 자정 직전 짧은 조각은 최소 높이 때문에 끝을 24시에 맞춰 올리고 한 줄에 `오후 11:45 ↓`.
  계산은 `lib/calendar-layout.ts`의 `daySegmentsOf` · `layoutDayBlocks`(조각 단위).
- **팝업 시간 편집**(시안 ④): 일정 줄(`Clock` + 날짜 · 시간 + `⌄`)을 누르면 아래에 회색 카드(`bg-secondary`, 모서리 14px) — 시작 · 끝 행(44px,
  값은 `bg-black/[0.06]` 7px 칸 15px 굵게), 끝 옆 `다음 날` 칩, 바닥 줄에 길이. 날짜는 캘린더에서 끌어서 바꾼다.
- **하위 할 일 "나중에"**(LATER-PLAN.md): 안 끝난 하위 할 일 행의 × 왼쪽 회색 칩 `FolderInput` + "나중에"(×와 구분되게 글자까지),
  데스크톱 hover · 터치 항상. 누르면 부모와 같은 PARA의 날짜 없는 할 일로 옮기고(메모 `- [[L사 업무(9/30)]]에서 옮김`), 화면 아래 가운데
  어두운 알림 + "되돌리기" 5초(`LaterToast`, body 포털).
- **메모 링크**(LINKS-PLAN.md, 시안 https://claude.ai/artifact/24GBhW8d4UHbpprCRwPXtv): 메모 보기 모드의 `[[이름(10/1)]]`은 `text-primary` 글자
  (hover 밑줄, 괄호는 숨김), 못 찾으면 보조 텍스트 색 + 점선 밑줄. 누르면 그 할 일 팝업을 지금 팝업 **위에 겹쳐** 연다(닫으면 돌아옴).
  원래 할 일의 하위 할 일 탭엔 체크리스트 아래 "나중에로 옮긴 할 일 N"(12px 회색 머리 + 체크리스트와 같은 헤어라인 카드, 행 = 회색 원 폴더
  아이콘 또는 완료 체크 · 제목 · 날짜 · `›`). 메모 글자를 그릴 때 링크가 필요하면 `MemoView`의 `links` · `LinkedText`를 재사용한다.
- **할 일 상세 팝업**: 머리(체크 · 제목 · 일정 · PARA)와 바닥(노트로 전환 · 삭제)은 고정, 가운데는 세그먼트 탭
  (하위 할 일 · 메모·URL · 사진 — 2026-09-30 회고 탭 없앰). 탭 이름에 내용 표시(`2/4` · 개수 · 점), 탭 본문 높이 고정. 새 항목은 탭으로 추가한다.
  메모·URL 탭은 열린 질문 + 확인 합계를 회색 알약 뱃지(`bg-black/10`, 17px 높이 · 11px 굵게)로 — 없으면 내용 점. 빨간 뱃지는 Inbox 개수 전용.
  완료된 할 일은 메모 탭으로 열고, 메모가 비었으면 회고 버튼 3개(틴트 배경 + 종류 색 아이콘)로 한 줄 유도.
- **사진**(PHOTOS-PLAN.md, 시안 https://claude.ai/artifact/4pamL9JChaBcYvJZXvfe2c): 파일은 Google Drive, 화면엔 `/api/photos/<id>`로.
  월 보기 = 그날 가장 이른 할 일의 대표 사진이 **칸 전체 배경**(위쪽을 어둡게 덮고 흰 글씨, 점엔 흰 테두리). 주 보기 = 1시간 30분 이상 블록이면
  **사진 배경**(흰 글씨, 하위 목록 · 진행률 바는 숨김), 짧으면 오른쪽 위 작은 썸네일(모서리 4px), 한 줄 블록엔 없음. 상세 팝업 사진 탭 =
  3열 정사각 그리드(모서리 8px) + ★ 대표 칩 + 점선 추가 칸, 누르면 검은 배경 크게 보기(`PhotoViewer`). 사진을 못 불러오면 조용히 평소 모양.
- **회고**(MEMO-MARKS-PLAN.md 7번 — 메모 줄 `[p]` `[c]` `[I]`): 종류 아이콘은 메모 줄 표시와 같은 둥근 사각형(`RetroKindIcon` = `MarkIcon`),
  색은 `--mark-*` 토큰으로 **아이콘에만**(텍스트는 기본 전경색). 종류 선택은 `RetroKindSelect` 드롭다운(macOS 메뉴) 하나만 쓴다.
  프로젝트 회고 탭 = 3열(열 머리 22px 아이콘 + 이름 + 개수) + 흰 카드 헤어라인 목록(줄 · 출처 12px), "다음엔"엔 파란 "+ 할 일로".
- **메모 줄 표시**(MEMO-MARKS-PLAN.md): 보기 모드 표시는 모두 체크박스와 같은 **18px 둥근 사각형(모서리 5px)** — 확인은 빈 칸 / 파란 체크 + 취소선,
  나머지는 `--mark-*` 틴트 칸 + bold 12px 아이콘(`?` · `i`는 원 없이 글자만). 줄 글자는 기본 전경색(답 `→ …`만 보조 텍스트 색), 불릿 줄은 회색 4px 점.
  편집 칸 위 툴바 5개(`MemoToolbar`, 눌린 버튼 = 틴트 배경 + 종류 색 테두리). 메모를 다른 곳에 그릴 때도 `MemoView` · `MemoEditor`를 재사용한다.
- **검색 패널**(SEARCH-PLAN.md, 시안 https://claude.ai/artifact/EXRxgXo2Cpn1oNFvj9DBCx): 데스크톱 = **가운데 팝업**(위에서 72px · 폭 640px ·
  모서리 14px · 흰 반투명 + blur + 큰 그림자, 뒤는 `bg-black/30`), 모바일 = 전체 화면(위 회색 입력칸 + 파란 "취소"). z-index 55 —
  결과로 연 할 일 팝업(z 60)이 그 위에 뜨고, 닫으면 검색으로 돌아온다. 입력칸 아래 칩(`확인할 것` · `질문`, 켜면 primary 배경).
  결과 카드 = 흰 카드(모서리 10px, 헤어라인 링) — 내용 → 맥락 줄(날짜 · 부모 할 일 · PARA 점 · URL 도메인, 12px 보조 텍스트) + 오른쪽 회색 출처 칩.
  선택(↑↓) = 파란 2px 링. **일치 단어 = `bg-warning/25`**(새 색 아님, 애플 메모 검색처럼 옅은 주황). 찾던 답(메모 `[i]`의 `→` 뒤 · 하위 할 일 📝 뒤)은 진하게.
  메모 스니펫은 회색(`bg-muted`) 칸 안에 줄 표시 아이콘(`MarkIcon`) 그대로. 사용자 텍스트는 `InlineText` 대신 `HighlightText`(인라인 코드 + 강조).
- **시간 균형**(BALANCE-PLAN.md, 시안 https://claude.ai/artifact/DfzCfv9eci2fj5k5F6mXXc ① ②): 목표 화면 목표 카드 아래 섹션(제목 20px).
  데스크톱 = 왼쪽 차트 카드(500px) + 오른쪽 목록 카드, 모바일 = 위아래. 차트: 요일별 누적 세로 막대(폭 30 · 모바일 24px, 위 끝만 4px 둥글게,
  조각 사이 2px 틈, 컨텍스트 순서대로 아래부터 · 맨 위 공백 = 회색 빗금), 오른쪽 눈금(6시간 단위, 최소 18시간), 오늘 요일 빨강, 남은 날은 바닥 선만.
  막대 hover/누르기 = 그날 내역 툴팁(팝오버 모양). 목록: 흰 카드 헤어라인 행 — 색 점 · 이름 · 대비(`↑ 2시간 30분`, ±15분 미만 `–`) · 비율 · 시간 · `›`,
  누른 행 = `bg-primary/[0.06]` + 막대에서 그 영역만 진하게(나머지 28%) + PARA별(같은 영역 색 점). 공백 행은 `bg-panel` + 빗금 칸.
  수면은 막대에 그리지 않고 목록 아래 회색 줄(달 아이콘 = 수면 컨텍스트 색). 값은 늘 글자로도 보인다(주황 · 청록은 흰 배경 대비가 3:1 미만이라).
- **주간 목표**(GOALS-PLAN.md): 진행률 링은 `GoalRing` 하나를 레일 · 목표 카드가 같이 쓴다(없음 = 점선, 목표 카드는 영역 색, 레일은 primary).
  목표 카드 = 흰 카드 + 링 · 제목 · PARA 칩 · `···` + 헤어라인 할 일 목록 + 파란 텍스트 버튼 2개. 캘린더 본문에는 목표를 그리지 않는다(정보량).
  PARA 고르기 드롭다운은 `ParaMenu`(`components/para/para-menu.tsx`) 하나만 쓴다.

## 7. 타이포그래피 / 아이콘

- 폰트: **모든 기기에서 `Wanted Sans Variable`**(CDN, `layout.tsx`)이 기본. 뒤의 `-apple-system, BlinkMacSystemFont, "SF Pro Text",
  "Apple SD Gothic Neo"`는 CDN을 못 불러왔을 때의 대체용(2026-09-29 사용자 결정 — 리디자인 때 애플 기기는 SF Pro가 먼저 오도록
  바뀌었던 걸 되돌림). 구글 폰트 새로 추가하지 마세요.
- 제목 22–28px bold · 자간 약간 좁게(`tracking-[-0.4px]`), 본문 14px, 보조 12–13px.
- 아이콘: **Phosphor**(`@phosphor-icons/react`, 2026-09-30 lucide에서 교체 — 모서리가 둥근 애플 느낌). 항상 `@/components/icons`에서
  가져오고(ESLint가 `lucide-react` · Phosphor 패키지 직접 import를 막음), 없는 아이콘은 그 파일에 한 줄 추가한다(아이콘별 경로 import — 개발 서버 속도).
  굵기는 `weight`로: 기본 `regular`, 14px 이하 작은 아이콘 · 체크 표시는 `bold`, 채운 상태(대표 사진 ★ 등)는 `fill`. 크기는 `className="size-…"`.
  이모지를 아이콘 대용으로 쓰지 마세요.
- **인라인 코드**: 사용자가 입력한 텍스트의 `` `VAR` `` 같은 백틱 구간은 인라인 코드(고정폭 · 옅은 회색 배경 `bg-black/[0.06]` ·
  `rounded-[4px]`)로 보인다. 사용자 텍스트를 그릴 때는 `{todo.content}` 대신 항상 `<InlineText text={…} />`(`components/inline-text.tsx`).
  편집 가능한 텍스트는 평소엔 렌더링된 텍스트, 누르면 원문 입력칸(백틱 포함)으로 바뀐다. 저장값은 원문 그대로.

## 8. 로그인 화면

`src/app/login/page.tsx` — 셸 밖(`(app)` 그룹 밖)에 있습니다. 중앙 정렬 좁은 컬럼 + 밑줄 인풋 구조는 그대로이고,
색은 토큰을 따라 새 팔레트로 바뀌었습니다. **가입(`가입하기`) 버튼은 의도적으로 비활성**입니다 — 요청 없으면 건드리지 마세요.

## 9. 새 화면을 추가할 때 체크리스트

1. 레이아웃이 걸린 작업이면 먼저 캔버스(위 링크)에 시안을 그려 컨펌받기 — 코드부터 짜지 않기.
2. `src/app/(app)/<경로>/page.tsx`에 **본문만**. 셸(레일 · Inbox · 계정)은 건드리지 않기(ESLint가 막음).
3. 색은 2번 표의 시맨틱 토큰만. 할 일 · PARA 색은 `useParaColor()`(영역 색, 위 3번).
4. radius는 4번 기준(`rounded-2xl` 금지, 원형 요소는 예외).
5. 드롭 영역이 필요하면 `data`로 선언하고 `handle-drop.ts`에 처리 추가.
6. 아이콘은 `@/components/icons`(Phosphor), 이모지 금지.

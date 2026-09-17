# 디자인 가이드 (DESIGN)

이 문서는 **2026-09 리디자인**(Claude Design 캔버스 목업 → 컨펌 → 코드 반영, 커밋 `a7072f5`
"Redesign UI to a minimal calendar style with left sidebar nav")에서 정한 디자인 맥락을
정리한 문서입니다. 새 세션에서 화면/컴포넌트를 추가하거나 수정할 때는 **이 문서를 먼저 읽고
아래 방향을 그대로 따라주세요.** 개념/기능 기획은 [PLANNING.md](./PLANNING.md), 작업 이력은
[HANDOFF.md](./HANDOFF.md) 참고.

> 원본 목업(Claude Design 캔버스, 편집 가능): https://claude.ai/artifact/Y1VejC9HJ92DevUks9pjzp
> 5개 화면(로그인 / 주간 캘린더 / PARA 보드 / PARA 상세 / 모바일 캘린더 / 모바일 보관함 바텀시트)이
> 같은 캔버스에 있습니다. 큰 레이아웃을 다시 논의할 일이 있으면 여기서 먼저 시안을 그려보고
> 컨펌받은 뒤 코드로 옮기는 걸 권장합니다(HANDOFF.md의 "UI는 코드로 바로 만들지 않는다" 규칙과 동일한 이유).

## 1. 방향

**미니멀 캘린더형** — Notion Calendar / Google Calendar를 참고 레퍼런스로 삼았습니다.
Apple 미리알림 스타일이었던 이전 버전 대비 다음이 바뀌었습니다:

- 내비게이션이 오른쪽 아이콘 레일 → **왼쪽 사이드바**(데스크톱)로 이동
- 모서리 radius를 전반적으로 **더 각지게** 축소
- 로그인 화면이 박스형 카드 → **가볍고 중앙 정렬된 레이아웃**(밑줄 인풋)으로 변경
- PARA 매핑(Project/Area/Resource)에 따라 캘린더 블록/카드에 **색상 코딩**이 생김

색 팔레트 자체(웜 크림 배경 + 블루그레이 프라이머리)는 **바꾸지 않고 유지**했습니다 —
사용자가 기존 팔레트를 마음에 들어 했고, radius·레이아웃·정보 구조만 새로 짰습니다.

## 2. 컬러 토큰

모두 `src/app/globals.css`의 CSS 변수. `@theme inline` 블록에서 Tailwind 유틸리티
(`bg-primary`, `text-muted-foreground` 등)로 매핑되어 있으니, **컴포넌트에서는 항상 시맨틱
토큰으로 참조하고 새 hex 값을 직접 쓰지 마세요.**

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--background` | `#F6F4F0` | `#1C1A17` | 페이지 배경 (웜 크림) |
| `--foreground` | `#3B3632` | `#EAE5DD` | 기본 텍스트 |
| `--card` | `#FFFEFB` | `#262320` | 카드/패널 배경 |
| `--primary` | `#5C7599` | `#90A6C7` | 브랜드 액센트, 버튼, "오늘" 표시 |
| `--secondary` / `--muted` | `#ECE8E2` | `#33302B` | 사이드바 배경, 중립 톤 배경 |
| `--muted-foreground` | `#8B8377` | `#A39B8D` | 보조 텍스트, "매핑 없음" 카테고리 색 |
| `--accent` | `#E7ECF2` | `#2B3542` | primary의 연한 틴트 (project 카테고리 배경으로도 재사용) |
| `--accent-foreground` | `#4D6584` | `#9FB4D4` | accent 위에 올라가는 텍스트/아이콘 |
| `--destructive` | `#C1685C` | `#D98A7E` | 삭제, 현재 시각 라인 |
| `--category-area` / `-tint` | `oklch(54% 0.07 155)` / `oklch(94% 0.014 155)` | `oklch(72% 0.09 155)` / `oklch(28% 0.035 155)` | Area 카테고리 |
| `--category-resource` / `-tint` | `oklch(54% 0.075 320)` / `oklch(94% 0.014 320)` | `oklch(72% 0.1 320)` / `oklch(28% 0.035 320)` | Resource 카테고리 |

**Project 카테고리는 별도 토큰이 없습니다** — `--primary`/`--accent`를 그대로 재사용합니다
(3개 카테고리 중 가장 자주 쓰이는 게 Project라서 기존 브랜드 컬러를 그대로 씀).

새 카테고리 컬러가 필요하면(향후 확장 시) 같은 방식으로 만드세요: `--primary`의 oklch
lightness(~54~56%)·chroma(~0.06~0.075)는 그대로 두고 **hue만 바꿔서** 톤을 통일하고,
라이트는 `L 94% / C ~0.014`, 다크는 `L 72%(본색) / L 28%(틴트)`로 파생.

## 3. 카테고리 색상 코딩

`src/lib/category.ts`:

```ts
getParaCategory(todo): "project" | "area" | "resource" | null
```

`todo.projectId`/`areaId`/`resourceId` 중 뭐가 채워져 있는지로 판정합니다(DB에
`todos_para_single_mapping` CHECK 제약으로 최대 1개만 값을 가짐이 보장됨 — `supabase/schema.sql`
참고). `CATEGORY_COLOR_VAR`/`CATEGORY_TINT_VAR`가 카테고리 → CSS 변수 이름 맵입니다.

적용된 곳:
- `calendar-block.tsx` — 블록 배경/왼쪽 보더가 카테고리 색. 매핑 없으면 `--muted-foreground`/`--secondary`
  (완료된 항목은 카테고리와 무관하게 항상 muted 톤).
- `todo-card.tsx` — PARA 배지(`badge` prop)가 없는 컨텍스트(사이드바 보관함 등)에서만 카테고리 점(dot) 표시.
  이미 컨테이너 이름 배지가 있으면(예: PARA 화면 안 보관함) 점은 안 그림 — 중복 정보라서.
- `container-card.tsx` — 카드 상단 3px 액센트 보더가 종류(project/area/resource)별 색.

새로운 곳에 카테고리 색을 쓸 일이 생기면 이 헬퍼를 재사용하세요. 색을 직접 `bg-blue-500`처럼
하드코딩하지 말고 `style={{ backgroundColor: `var(${CATEGORY_TINT_VAR[category]})` }}` 형태로.

## 4. Radius

`--radius: 0.5rem`(8px)가 기준값이고, `rounded-sm/md/lg/xl`이 여기서 자동 파생됩니다
(`--radius-sm` 4px / `-md` 6px / `-lg` 8px / `-xl` 12px). **주의**: Tailwind 기본
`rounded-2xl`/`rounded-3xl`/`rounded-full`은 이 변수에 안 묶여 있습니다.

- 카드·모달·패널: `rounded-lg`(8px) 또는 `rounded-xl`(12px, 좀 더 큰 컨테이너)
- 버튼·인풋·칩·배지: `rounded-sm`(4px)~`rounded-md`(6px)
- 아바타·체크박스·오늘 날짜 원·FAB·점(dot) 등 **의도적으로 원형인 요소는 `rounded-full` 그대로 유지** —
  "radius가 너무 둥글다"는 피드백은 사각형 카드/버튼 얘기였지, 체크박스나 아바타 같은 원형
  요소를 각지게 하라는 뜻이 아니었습니다. 상태 배지(진행중/완료 등)는 예전엔 pill(`rounded-full`)이었지만
  지금은 작은 사각 칩(`rounded-sm`)으로 바뀌었습니다 — 이건 사각형이 맞습니다.
- `rounded-2xl`을 새로 쓰지 마세요. 기존에 남아있던 `rounded-2xl`은 전부 `rounded-lg`/`rounded-xl`로
  낮춰뒀습니다.

## 5. 레이아웃 — 데스크톱 사이드바 / 모바일 바텀 내비게이션

**데스크톱(`sm:` 이상)**: 왼쪽에 고정된 260px 사이드바(`app-sidebar.tsx`) — 브랜드,
"+ 새 할 일", 미니 캘린더(`mini-calendar.tsx`), 할 일 보관함(항상 펼쳐진 상태), 캘린더/PARA
전환, 계정(이메일+로그아웃). 본문은 `sm:pl-[260px]`로 공간을 확보합니다.

**모바일(`sm:` 미만)**: 하단 탭바(`icon-rail.tsx`, 3개 고정 항목: Todo/캘린더/PARA)와,
"Todo" 탭을 누르면 열리는 보관함 바텀시트.

`AppSidebar`는 **모바일/데스크톱 공용 단일 컴포넌트**이고 항상 마운트되어 있습니다 —
`panelOpen` 상태에 따라 모바일에서 `hidden`↔바텀시트로 바뀌고, `sm:` 프리픽스가 데스크톱에서
그 상태를 덮어써서 항상 사이드바로 보이게 만드는 순수 Tailwind 반응형 트릭입니다(별도 JS
미디어쿼리 훅 없음). 이렇게 한 이유: 보관함은 dnd-kit `SortableContext` + `useDroppable({id:
BACKLOG})`를 갖고 있는데, 같은 id를 가진 SortableContext가 동시에 두 개 마운트되면 안 되기
때문입니다. **새 화면을 만들 때도 `AppSidebar`를 그대로 재사용하세요** — 직접 사이드바를
새로 만들지 말고.

캘린더 페이지에서만 `monday`/`onSelectWeek` prop을 넘겨서 미니 캘린더가 이번 주를 강조하고
날짜 클릭 시 그 주로 이동하게 되어 있습니다. PARA류 화면은 이 prop 없이 씁니다(날짜 클릭 시
그냥 `/`로 이동).

## 6. 타이포그래피 / 아이콘

- 폰트: `Wanted Sans Variable`(CDN, `layout.tsx`) → 실패 시 `-apple-system, BlinkMacSystemFont,
  ...` 순으로 폴백. 구글 폰트 새로 추가하지 마세요.
- 아이콘: `lucide-react`만 사용. 이모지를 아이콘 대용으로 쓰지 마세요.

## 7. 로그인 화면

`src/app/login/page.tsx` — 박스형 카드(`rounded-2xl bg-card p-6 shadow ring-1`)를 걷어내고
페이지 배경 위에 중앙 정렬된 좁은 컬럼(340px)만 놓는 방식으로 바꿨습니다. 인풋도 테두리 박스
대신 밑줄(`border-0 border-b`)만. 왼쪽 상단에 작은 브랜드 마크. **가입(`가입하기`) 버튼은
의도적으로 비활성 상태입니다**(개인용 앱이라 사용자가 막아둔 것 — `mode` state와 커밋된 토글
버튼은 코드에 남아있지만 렌더링 안 함). 다시 열어달라는 요청이 없는 한 건드리지 마세요.

## 8. 새 화면을 추가할 때 체크리스트

1. 레이아웃이 걸린 작업이면 먼저 캘린더 캔버스(위 링크)나 새 Claude Design 캔버스에 시안을
   그려서 컨펌받기 — 코드부터 짜지 않기.
2. 색은 위 2번 표의 시맨틱 토큰만 사용. 새 색이 필요하면 3번 방식(oklch, hue만 교체)으로 파생.
3. radius는 4번 표 기준(`rounded-2xl` 금지, 원형 요소는 예외).
4. 데스크톱 내비게이션이 필요하면 `AppSidebar` 재사용, 새로 만들지 않기.
5. PARA 매핑과 관련된 색이면 `lib/category.ts`의 `getParaCategory`/`CATEGORY_*_VAR` 재사용.
6. 아이콘은 `lucide-react`, 이모지 금지.

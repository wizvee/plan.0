# 메모 줄 표시(체크박스 문법) + 모아보기 계획

작성 2026-09-30. 시안(컨펌 완료): https://claude.ai/artifact/JfkwtcvcU885kzNkdJGV7Q
(① 보기 모드 · ② 툴바 · ③ 질문 해결 · ④⑤ 검색 패널 모아보기 · ⑥ 아이콘 라이브러리 비교)

> **상태: 시안 컨펌(2026-09-30) → 1단계 구현 전.** 다음 세션은 **8번 "1단계 구현 순서"의 1-A부터** 시작한다.
> 1단계 = 메모 줄 표시 + 확인할 것 · 질문 모아보기. 2단계 = 회고를 메모로 흡수(1단계를 써본 뒤, 10번).
> 선행 작업이던 **아이콘 교체(lucide → Phosphor)는 끝남**(HANDOFF.md 35번) — 아이콘은 `@/components/icons`에서만.

## 1. 왜

- 업무 중에 "공식 할 일까진 아닌데 체크해야 할 것"을 할 일 메모에 `- ☐ …`로 적고 있다. 나중에 모아 보고, 확인하면 체크하고 싶다.
- 할 일 팝업 탭이 기능마다 늘었다(하위 할 일 · 회고 · 메모·URL · 사진). 특히 **회고는 할 일 하나에서만 쓰는데 탭을 늘 차지**한다.
  → 회고도 메모 줄로 적고(👍 👎 💡 대신 표시 문법), 탭은 없앤다(2단계).
- 한 칸(메모)에 흐름을 끊지 않고 적고, **줄 앞 표시로 종류를 나눠 모아 본다**.

## 2. 문법 (옵시디언 커스텀 체크박스 — Anuppuccin/Primary 테마 표와 같게)

| 종류 | 열림 | 끝남 | 보기 모드 모양 | 모아보기 |
|---|---|---|---|---|
| 확인 필요 | `- [ ]` | `- [x]` | 빈 체크박스 → 파란 체크 + 줄 흐리게 · 취소선 | **확인할 것**(열린 것만) |
| 질문 | `- [?]` | `- [i]` (+ `→ 답`) | 보라 `?` 칸 → 회색 `i` 칸(정보) | **질문**(열린 것만) |
| 잘한 점 | `- [p]` | — | 초록 ThumbsUp 칸 | 회고(2단계) |
| 아쉬운 점 | `- [c]` | — | 주황 ThumbsDown 칸 | 회고(2단계) |
| 다음엔 | `- [I]` (대문자 i) | — | 파란 Lightbulb 칸 | 회고(2단계) |

- **왜 이 문법인가**: 키보드로 칠 수 있고(이모지 입력기 불필요), `[I]`처럼 검색하면 그 종류만 모이고, Drive 노트(.md) · 옵시디언에서도 그대로 체크박스로 보인다.
- **질문이 끝나면 `[x]`가 아니라 `[i]`** — 답을 알게 된 "정보"가 된다. `[x]`로 바꾸면 확인할 것과 섞이고 질문이었다는 게 사라진다.
  나중에 `[i]`로 검색하면 알게 된 것들이 모인다(SEARCH-PLAN.md의 목적과 같음).
- **인식 규칙**(줄 단위): `^(\s*)((?:[-*•]|\d+\.)\s*)?\[( |x|X|\?|i|I|p|c)\](?:\s+(.*))?$`
  (① 들여쓰기 ② 불릿 — 있어도 없어도 됨 ③ 표시 문자 ④ 내용). `[X]` = `[x]`. `[i]` · `[I]`는 **대소문자를 구분**한다.
  그 외 문자(`[>]` 등)는 보통 줄. **`]` 뒤에 공백이나 줄 끝**이어야 표시 — 마크다운 링크 `[x](url)`는 표시가 아니다.
  내용이 빈 줄(`- [ ]`)도 표시로 인식한다(Enter 이어 쓰기 직후 상태).
- **예전 표시**: `☐` · `☑`로 시작하는 줄(`^(\s*)((?:[-*•])\s*)?(☐|☑)\s*(.*)$`)도 `[ ]` · `[x]`로 읽는다(지금 메모 그대로 모임).
  한꺼번에 바꾸는 변환은 하지 않는다. 그 줄을 툴바 · 체크로 **건드릴 때만** 표준 문법(`- [ ]` / `- [x]`)으로 다시 쓴다.
- **저장은 원문 그대로**(메모 글자). DB 변경 없음.

## 3. 입력 — 오타를 막는 툴바

메모 편집 칸 위에 버튼 5개: `확인 · 질문 · 잘한 점 · 아쉬운 점 · 다음엔` (아이콘 + 글자, 모바일은 입력칸 위에 붙음).

- **커서가 있는 줄**(여러 줄 선택이면 전부)에 적용 — 표시가 없으면 `- [ ] `처럼 붙이고, 다른 표시면 바꾸고, 같은 표시면 뗀다.
  불릿이 이미 있으면(`- 내용`) 그 뒤에 넣는다(`- [ ] 내용`).
- **Enter로 이어 쓰기**: 표시가 있는 줄 끝에서 Enter → 다음 줄도 같은 표시(`- [?] `)로 시작. 표시만 있는 빈 줄에서 Enter → 표시를 떼고 보통 줄.
  끝남 상태(`[x]` · `[i]`) 줄에서 Enter면 열림 상태(`[ ]` · `[?]`)로 이어 간다.
- 직접 쳐도 된다(문법 그대로). `[x]` · `[i]`는 툴바에 없다 — 보기 모드에서 아이콘을 눌러 바꾼다.

## 4. 보기 모드 — 누르면 상태가 바뀐다

메모는 평소 렌더링된 모양, 누르면 원문 편집(지금과 같음). 보기 모드에선 표시 대신 아이콘을 그리고(DESIGN.md "이모지를 아이콘 대용으로 쓰지 않는다"),
모든 표시는 **체크박스와 같은 18px 둥근 사각형(모서리 5px)** — 확인은 빈 칸 / 파란 체크, 나머지는 틴트 칸 + Phosphor bold 아이콘(12px).
`?` · `i`는 원 없이 글자만(칸 안에 원이 겹치면 지저분함). 색은 체크박스 무게에 맞춰 **기존 회고 틴트보다 한 단계 진하게**(2026-09-30 시안 컨펌):

| 종류 | 틴트(라이트) | 아이콘(라이트) | 기준 |
|---|---|---|---|
| 질문 | `#EBD9F8` | `#9437C9` | `--category-resource` 계열 |
| 정보 | `rgba(0,0,0,.09)` | `#58585D` | 중립 |
| 잘한 점 | `#D3EEDD` | `#22884B` | `--retro-keep` 계열 |
| 아쉬운 점 | `#FFE6C2` | `#B35F00` | `--retro-problem` 계열 |
| 다음엔 | `#D6E7FD` | `#0068D6` | `--retro-try` 계열 |

구현 때 `globals.css`에 토큰으로 넣는다(DESIGN.md 2번 — 컴포넌트에 hex 금지). 이름 · 다크 값 제안:

| 토큰 | 라이트 | 다크(제안 — 다크 모드는 아직 안 켜져 있음) |
|---|---|---|
| `--mark-question` / `-tint` | `#9437C9` / `#EBD9F8` | `#C77DF3` / `#3D2450` |
| `--mark-info` / `-tint` | `#58585D` / `rgba(0,0,0,.09)` | `#B0B0B5` / `rgba(255,255,255,.14)` |
| `--mark-keep` / `-tint` | `#22884B` / `#D3EEDD` | `#3DD66A` / `#1C4A2C` |
| `--mark-problem` / `-tint` | `#B35F00` / `#FFE6C2` | `#FFB340` / `#4A3212` |
| `--mark-try` / `-tint` | `#0068D6` / `#D6E7FD` | `#409CFF` / `#143A63` |

`@theme inline`에도 `--color-mark-*`로 매핑(기존 `--color-retro-*` 옆). 2단계에서 회고를 흡수하면 `--retro-*`는 이 값으로 합친다.
확인 체크박스는 토큰을 새로 만들지 않는다 — 빈 칸 테두리 `muted-foreground` 계열(시안 `#98989D` 1.6px), 체크 = `primary` 채움 + 흰 체크.

- **확인 필요**: 체크박스를 누르면 `[ ]` ↔ `[x]`.
- **질문**: `?` 칸을 누르면 `[i]`로 바뀌고 그 줄 아래에 **답 입력칸**이 열린다(시안 ③). Enter → 줄 끝에 ` → 답` 덧붙임,
  비우고 Enter · 바깥 누름 · Esc → 표시만 `[i]`. `i` 칸을 누르면 `[?]`로 되돌린다(적어 둔 답은 남김).
- **회고 3종**: 아이콘만(누를 동작 없음).
- 줄의 나머지 글자는 지금처럼 `InlineText`(백틱 코드).

## 5. 모아보기 — 검색 패널의 칩 (SEARCH-PLAN.md와 합침)

검색 패널(⌘K · 레일 버튼)을 열면 입력칸 아래에 칩: **`확인할 것 N` · `질문 N`**(열린 것 개수).

- 칩을 누르면 그 종류의 **열린 줄만**, **할 일별로 묶어** 최근 날짜 순. 묶음 머리 = 할 일 이름 · 날짜 · PARA(카테고리 점).
- 줄에서 바로 체크(확인할 것) · 해결(질문 → 답 입력) 가능. 줄을 누르면 그 할 일 팝업의 메모 탭.
- 아래 "끝난 것도 보기" 토글 — `[x]` · `[i]`까지(최근 순).
- 검색어로 `[?]` · `[I]` 등을 치면 그 종류의 줄 전부(열림 · 끝남 모두) — 칩과 같은 결과 + 끝난 것.
- 검색어와 칩을 함께 쓰면 그 안에서 좁힌다(예: 칩 `질문` + `SAP`).

## 6. 지금 코드 (2026-09-30, main `6d85df8` 기준 — 구현 전에 알아둘 것)

- **메모가 화면에 보이는 곳은 할 일 상세 팝업 한 곳뿐**: `src/components/todo-detail-modal.tsx`의 `memoAndUrl`.
  할 일은 "메모 · URL" 탭 안, 노트(`kind === "note"`)는 탭 없이 바로 — **둘 다 같은 `memoAndUrl`을 쓰니 줄 표시도 둘 다에 적용**된다.
  캘린더 블록 · 월 보기 · 할 일 카드는 메모를 그리지 않는다(`onMemoEdit`을 팝업에 넘기기만 함).
- 보기 상태 = 메모 전체를 감싼 **`<button>` 하나**(`onClick → setEditingMemo(true)`, 안에 `<InlineText text={memo} />`).
  편집 상태 = `<textarea>`(autoFocus, **`onBlur={commitMemo}`** — 포커스가 빠지면 저장하고 보기 상태로 돌아감).
- 저장 경로: `commitMemo()`(앞뒤 공백 trim, 바뀌었을 때만) → `onMemoEdit(id, memo)` → `useTodoActions().editMemo`
  (`src/lib/app-data/todo-actions.ts`) → `updateTodo(id, { memo: memo || null })`(`src/lib/supabase/todos.ts`, **낙관적** — 스토어 먼저 바꾸고 DB).
- 팝업은 `memo`를 로컬 state(`useState(todo.memo ?? "")`)로 들고 있다. 보기 모드에서 체크 · 해결로 바꿀 때는 **로컬 `setMemo(next)` + `onMemoEdit(todo.id, next)`를 같이** 호출.
- 메모를 쓰는 다른 곳(글자만 넣음, 수정 불필요): `/api/clip`(단축어 스크랩), `lib/jev.ts`, "나중에"(`moveSubtaskToLater` — `…에서 옮김`).
- 모든 할 일은 앱을 열 때 기간 제한 없이 메모리에 올라와 있다(`AppDataProvider` · `fetchAllRows`) → 모아보기는 **브라우저에서 계산**, 서버 · DB 변경 없음.
- id로 팝업 여는 래퍼가 `src/components/reflection/project-retro-tab.tsx`의 `SourceTodoModal`(194행 근처)에 이미 있다 — 모아보기에서 꺼내 쓴다(SEARCH-PLAN.md 4번과 같은 계획).
- 셸 UI 상태는 `src/lib/shell-ui.tsx`(Inbox 열림 · 컨텍스트 관리 팝업). 검색 패널 상태(`searchOpen` 등)는 **아직 없다**.
- 회고 아이콘 `ReflectionKindIcon`(`components/reflection/reflection-kind.tsx`)은 **원형**이라 줄 표시에 재사용하지 않는다(줄 표시는 둥근 사각형).

## 7. 파일 (1단계)

| 파일 | 내용 |
|---|---|
| `src/lib/memo-marks.ts` (새) | 순수 함수 — React · DOM 의존 없음. 아래 9-1 |
| (저장소 밖) 확인 스크립트 | 테스트 러너가 없는 저장소라 9-1 케이스를 스크립트로 확인. `memo-marks.ts`는 **`@/` import 없이** 만들어 두면 세션 scratchpad에서 `node check.ts`(Node 22.18+ 타입 제거 내장, import 경로에 `.ts` 붙임)나 `npx -y tsx check.ts`로 바로 돌릴 수 있다. 저장소에 넣으면 tsconfig가 `.ts` 확장자 import를 막으니 넣지 않는다 |
| `src/app/globals.css` | `--mark-*` 토큰 + `@theme inline` 매핑(4번 표) |
| `src/components/icons.ts` | `Square` · `Question` · `QuestionMark` 추가(툴바 regular · 표시 bold). `ThumbsUp` · `ThumbsDown` · `Lightbulb`는 이미 있음 |
| `src/components/memo/memo-mark-icon.tsx` (새) | 18px 둥근 사각형(`rounded-[5px]`) 하나 — 종류별 틴트 배경 + 12px 아이콘. `i`는 Phosphor에 원 없는 글리프가 없어 **여기서만 SVG 한 개를 직접 그린다**(시안 path: `M128 100a16 16 0 0 1 16 16v80a16 16 0 0 1-32 0v-80a16 16 0 0 1 16-16Zm0-60a20 20 0 1 1 0 40a20 20 0 0 1 0-40Z`, viewBox 256) — DESIGN.md 7번에 예외로 적기 |
| `src/components/memo/memo-view.tsx` (새) | 보기 모드: 줄마다 [표시 칸][InlineText]. 표시 없는 줄은 4px 회색 점, 빈 줄은 높이만. 확인 체크 · 질문 해결(답 입력칸) |
| `src/components/memo/memo-toolbar.tsx` (새) | 버튼 5개(시안 ②) — textarea ref를 받아 선택 영역 → `setMark` 적용, 지금 줄 종류를 눌림 상태로 |
| `src/components/todo-detail-modal.tsx` | `memoAndUrl`의 보기 `<button>` → `MemoView`, 편집 textarea 위에 `MemoToolbar`, textarea `onKeyDown`에 Enter 이어 쓰기. `initialTab` prop(모아보기에서 메모 탭으로 열기) |
| `src/components/todo-detail-by-id.tsx` (새) | `SourceTodoModal`을 꺼낸 것 — `todoId` · `initialTab` · `onClose`. project-retro-tab도 이걸 쓰게 바꿈 |
| `src/lib/app-data/use-memo-marks.ts` (새) | 모든 할 일 메모를 파싱해 모아보기 목록 · 개수(`useMemo`, 할 일 배열이 바뀔 때만) |
| `src/lib/shell-ui.tsx` | `searchOpen` · `openSearch(chip?)` · `closeSearch()` (Inbox와 같은 방식, localStorage에는 저장 안 함) |
| `src/components/shell/search-panel.tsx` (새) | 시안 ④⑤ 패널 — `components/shell/app-shell.tsx`에서 한 번만 렌더링. ⌘K / Ctrl+K |
| `src/components/shell/app-rail.tsx` | 검색 버튼(자리는 1-C 전에 사용자 확인 — 8번) |

## 8. 1단계 구현 순서 (단계마다 tsc · eslint → 커밋 · 푸시, 사용자가 "main에 머지해줘" 하면 머지)

- **1-A. 규칙 함수** — `lib/memo-marks.ts` + 9-1 케이스 스크립트. UI 없음.
- **1-B. 팝업 안 줄 표시** — 토큰 · `MemoMarkIcon` · `MemoView` · `MemoToolbar` · Enter 이어 쓰기 · 질문 해결. 시안 ①②③ 그대로.
  **여기까지만으로도 쓸 수 있다** — 끝나면 가짜 Supabase로 화면 확인(HANDOFF.md "화면 확인 방법") 후 사용자에게 보여주고 머지 여부 묻기.
- **1-C. 모아보기 패널** — 시작 전에 사용자에게 확인할 것(시안 ④⑤에 없는 부분):
  ① 레일 검색 버튼 자리 — 데스크톱 레일은 목표 · 캘린더 · PARA · Inbox · 계정, **모바일 하단 탭은 이미 5칸**.
  ② 모바일에서 패널 모양(가운데 팝업 vs 전체 화면 시트). 필요하면 캔버스에 작은 시안 추가 후 컨펌.
  ③ 입력칸 범위 — 1-C에서는 **모아보기 목록 안을 부분 문자열로 좁히는 것만**, 전체 검색(SEARCH-PLAN.md 3번 규칙 · 결과 카드)은
  SEARCH-PLAN.md 2~4단계로 이어서(결과 카드 시안이 아직 없음). 칩을 안 고른 상태에서 입력하면 "검색은 곧 — 지금은 칩을 골라 보세요" 정도.
  그다음 `use-memo-marks` · `search-panel` · `todo-detail-by-id` · 팝업 `initialTab` · 레일 버튼 · ⌘K.
- **1-D. 문서** — FEATURES.md(새 항목), DESIGN.md 6번(줄 표시 · 모아보기 패턴, `MemoMarkIcon` 재사용 규칙, `i` SVG 예외),
  HANDOFF.md 결정 기록, 이 문서 상태 갱신.

## 9. 세부 규칙 · 함정

### 9-1. `lib/memo-marks.ts` 함수와 확인 케이스

```ts
type MarkKind = "check" | "question" | "keep" | "problem" | "try";
type MarkChar = " " | "x" | "?" | "i" | "p" | "c" | "I";
interface MemoLine { index: number; raw: string; indent: string; bullet: string | null; char: MarkChar | null;
  kind: MarkKind | null; done: boolean; content: string; legacy: boolean /* ☐ ☑ */ }
parseMemoLines(text): MemoLine[]              // "\n"으로 나눔(\r\n도 처리). 표시 없는 줄은 char/kind null
setMark(text, lineIndexes, kind): string       // 툴바: 없음→붙임, 다른 종류→바꿈, 같은 종류(끝남 포함)→뗌
toggleDone(text, lineIndex): string            // [ ]↔[x] (☐/☑ 줄은 표준 문법으로 다시 씀)
resolveQuestion(text, lineIndex, answer): string   // [?]→[i], answer.trim()이 있으면 줄 끝에 " → 답"
reopenQuestion(text, lineIndex): string        // [i]→[?], 답은 그대로
continueOnEnter(line): { insert: string } | { clearLine: true } | null  // 9-3
lineIndexesInSelection(text, start, end): number[]  // textarea 선택 → 줄 번호들
```

| 입력 | 결과 |
|---|---|
| `- [ ] 인플루언스 점검` | check · 열림, content `인플루언스 점검` |
| `[x] 끝남` (불릿 없음) | check · 끝남 |
| `  * [?] 들여쓴 질문` | question, indent `  `, bullet `* ` |
| `1. [I] 다음엔` | try (대문자 I) |
| `- [i] 답 알게 됨 → ERP만` | question · 끝남(정보) |
| `- [X] 대문자 X` | check · 끝남 |
| `- [>] 미룸` / `[x](https://a.b)` / `- [ ]내용`(공백 없음) | 표시 아님 |
| `- [ ]` (내용 없음) | check · 열림, content `` |
| `☐ 예전 표시` / `- ☑ 예전 끝남` | check 열림 / 끝남, legacy |
| setMark(`내용`, question) | `- [?] 내용` (불릿 없으면 `- ` 붙임) |
| setMark(`- 내용`, check) | `- [ ] 내용` |
| setMark(`- [ ] 내용`, question) | `- [?] 내용` |
| setMark(`- [?] 내용`, question) · setMark(`- [i] 내용`, question) | `- 내용` (뗌 — 불릿은 남김) |
| toggleDone(`☐ 예전`) | `- [x] 예전` |
| resolveQuestion(`- [?] 전략은?`, `BI는 100`) | `- [i] 전략은? → BI는 100` |
| resolveQuestion(`- [?] 전략은?`, `  `) | `- [i] 전략은?` |

바꾸는 함수는 **해당 줄만** 다시 쓰고 나머지 줄 · 줄바꿈은 글자 그대로 둔다(들여쓰기 · 불릿 기호 보존).

### 9-2. 툴바 (시안 ②)

- 버튼에 **`onMouseDown={(e) => e.preventDefault()}`** 필수 — 안 그러면 버튼을 누르는 순간 textarea가 blur → `commitMemo`가 돌아
  편집 상태가 닫혀 버린다(지금 textarea가 `onBlur`로 저장 · 닫기).
- 적용 후 커서 위치 보존: 바뀐 줄의 길이 차이만큼 selectionStart/End를 옮겨 `requestAnimationFrame` 안에서 `setSelectionRange`.
- "지금 줄 종류가 눌린 상태" — textarea `onSelect` · `onKeyUp` · `onClick`에서 커서 줄을 다시 계산.
- 버튼: `확인(Square) · 질문(Question) · 잘한 점(ThumbsUp) · 아쉬운 점(ThumbsDown) · 다음엔(Lightbulb)` regular 14px + 글자,
  높이 28 · `rounded-[7px]`, 평소 `bg-black/[0.05]`, 눌림 = 그 종류 틴트 배경 + 색 글자 + 1.5px 테두리. `role="toolbar"` · `aria-pressed`.
- 모바일: 입력칸 바로 위 한 줄(넘치면 가로 스크롤, 줄바꿈 안 함).

### 9-3. Enter 이어 쓰기

- textarea `onKeyDown`에서 Enter(Shift 없이)이고 **`e.nativeEvent.isComposing`이 아닐 때만** — 한글 입력 중 Enter(조합 확정)를 가로채면
  마지막 글자가 두 번 들어가거나 사라진다.
- 커서가 **표시 있는 줄의 끝**이면 기본 동작을 막고 `\n` + 같은 들여쓰기 · 불릿 · 표시(끝남 `[x]`/`[i]`면 열림 `[ ]`/`[?]`로) 삽입.
- 표시만 있고 내용이 빈 줄에서 Enter → 그 줄의 표시를 지우고(빈 줄로) 줄바꿈하지 않음(목록 끝내기 — 메모 앱 관례).
- 줄 중간에서 Enter · 표시 없는 줄은 기본 동작 그대로.

### 9-4. 보기 모드 (시안 ① ③)

- 지금의 "메모 전체 = 버튼 하나"를 `div`로 바꾼다 — 안에 표시 버튼이 들어가야 해서(버튼 안 버튼은 HTML 위반).
  **글자 부분을 누르면 편집으로**(지금과 같음), 표시 칸 버튼은 `stopPropagation`. 키보드용으로 컨테이너 `tabIndex={0}` + Enter/Space → 편집.
- 줄 레이아웃: `flex items-start gap-[9px]`, 표시 칸 `mt-px size-[18px]`, 글자 15px(지금 메모와 같게) `leading-snug`. 빈 메모는 지금처럼 "메모" 자리표시.
- 확인 끝남 = `primary` 채운 칸 + 흰 `Check`(bold) + 글자 `text-muted-foreground line-through`. 정보(`[i]`)는 취소선 없음, 답(` → …`)은 보조 텍스트 색.
- 질문 해결 입력칸: 줄 아래, 왼쪽 29px 들여, 높이 32 · `rounded-[7px]` · primary 포커스 링(시안 ③). placeholder `답을 적어두세요 (Enter · 비워도 돼요)`.
  Enter → `resolveQuestion`, Esc → 입력칸만 닫기(**`e.preventDefault()`** 해서 팝업 Esc 닫기와 겹치지 않게 — 팝업은 `defaultPrevented`면 무시함),
  바깥 누름 → 답 없이 `[i]`로 확정.
- 회고 3종 칸은 `span`(누를 동작 없음, `aria-label`만).
- 각 칸 `aria-label`: `확인 필요 — 누르면 체크` / `확인함 — 누르면 되돌리기` / `질문 — 누르면 해결` / `알게 된 것 — 누르면 질문으로 되돌리기`.

### 9-5. 모아보기 (시안 ④⑤, 1-C)

- 목록 = 모든 할 일 · 노트의 메모에서 `kind`가 check / question인 줄. 칩 개수 N = **열린 것**(`[ ]` · `[?]`) 수.
- 묶음 = 할 일 하나. 머리 줄: 이름(`InlineText`) · 날짜(`9월 30일 (수)`, 없으면 "날짜 없음") · PARA(카테고리 점 + 이름, `lib/category.ts`).
  순서: 캘린더 날짜 최근 먼저, 날짜 없으면 만든 날. 묶음 안은 메모 줄 순서.
- 줄: 확인 칸(누르면 `toggleDone` → `editMemo`) / 질문 칸 + `해결` 버튼(누르면 9-4와 같은 답 입력칸). 줄 글자를 누르면
  `TodoDetailById`(`initialTab="memo"`)로 팝업 — 패널은 닫지 않고 아래에 둔다(팝업 z-[60] > 패널 z). 팝업의 Esc가 패널까지 닫지 않게.
- "끝난 것도 보기" 토글(기본 끔) — 켜면 `[x]` · `[i]`도(흐리게). 체크한 줄은 **바로 사라지지 않고** 패널을 닫았다 열 때까지 흐리게 남긴다(실수로 누른 것 되돌릴 수 있게).
- 입력칸(1-C 범위): 칩이 골라져 있으면 그 목록을 줄 내용 · 할 일 이름 부분 문자열(NFKC · 소문자)로 좁힘.
- 셸 규칙(DESIGN.md 5번): 패널은 `components/shell/`에 두고 셸이 렌더링, 화면은 `useShellUI().openSearch()`만 호출.
  모달 · 패널은 `createPortal(…, document.body)`(DESIGN.md 6번 모달 규칙).

### 9-6. 확인 (1단계 완료 기준)

- [ ] 9-1 표의 케이스 전부 스크립트로 통과
- [ ] 보기 모드: 시안 ①처럼 보임(칸 크기 · 색 · 점 · 취소선), 칸을 눌러도 편집으로 안 들어감, 글자를 누르면 편집
- [ ] 체크 · 해결 · 되돌리기가 DB에 저장(가짜 Supabase 요청 로그의 PATCH `todos.memo`)되고 원문이 9-1대로
- [ ] 툴바: 붙이기 · 바꾸기 · 떼기 · 여러 줄 선택 · 누른 뒤에도 편집 상태 유지 · 커서 위치 유지
- [ ] Enter 이어 쓰기 · 빈 표시 줄 Enter로 끝내기 · **한글 입력 중 Enter 정상**
- [ ] 예전 `☐ ☑` 메모가 체크박스로 보이고 모아보기에 모임
- [ ] 노트(`kind=note`) 팝업에서도 같은 동작
- [ ] (1-C) ⌘K · 레일 버튼으로 열림, 칩 개수 · 묶음 · 순서, 줄 누르면 메모 탭 팝업, Esc 순서(답 입력칸 → 팝업 → 패널)
- [ ] tsc(`.next/types`가 없을 때의 `LayoutProps` 오류는 무시 — `next dev` 한 번이면 사라짐) · eslint(기존 `login/page.tsx` 경고 1개 제외) 통과

## 10. 2단계 — 회고 흡수 (1단계를 써본 뒤 결정)

- 기존 `todo_reflections`를 할 일 메모 끝에 `- [p] / [c] / [I] 내용` 줄로 옮긴다(마이그레이션 스크립트). "다음엔 → 할 일로" 연결은 줄 끝 `→ 할 일로 만듦`.
- 할 일 팝업의 회고 탭을 없앤다(탭: 하위 할 일 · 메모·URL · 사진). 프로젝트 회고 탭은 프로젝트 할 일 메모의 `[p] [c] [I]` 모아보기로.
- 프로젝트에 직접 쓴 회고(할 일에 안 붙은 것)를 어디에 둘지 — 그때 정한다.

# Inbox PARA 그룹 계획

작성 2026-10-01. 연결 시안: https://claude.ai/artifact/NagRGwGtAevetvXLLSrr2p
(① A안 섹션 머리 · ② B안 흰 카드 · ③ C안 종류 묶음 · ④ A안 다른 그룹으로 끌기 · ⑤ A안 모바일)

**상태: 구현 완료(2026-10-01).** 사용자 컨펌: **A안 + ④ 끌어 놓기**. 완료된 Project · 보관한 Area/Resource 그룹 위치는
따로 답이 없어 제안대로 **맨 아래**.

## 1. 무엇을 왜

Inbox가 PARA 구분 없이 만든 순서로만 쌓여서 난잡하다. TickTick 인박스처럼 **할 일이 속한 PARA별로 묶고**, 그룹을
**접을 수 있게**, 그룹마다 **몇 개인지** 보이게 한다.

## 2. 합의한 규칙

| 항목 | 규칙 |
|---|---|
| 묶는 단위 | PARA 컨테이너 하나 = 그룹 하나(`L사 업무`, `건강` …). 매핑 없는 할 일 · 노트는 **미분류** 그룹 |
| 그룹 머리 | `⌄`(접으면 `›`) + 카테고리 점(미분류는 회색 빈 원) + 이름 + 오른쪽 개수. 누르면 접기/펼치기 |
| 개수 | 그 그룹에 보이는 항목 전부(완료 · 노트 포함 — Inbox 제목 옆 개수와 같은 기준) |
| 그룹 순서 | **미분류 맨 위**(새로 적은 할 일이 들어가는 분류 대기 칸) → Project → Area → Resource. 같은 종류 안은 PARA 목록과 같은 순서(시작일 · 만든 날 순). **완료된 Project · 보관한 Area/Resource는 맨 아래**(같은 P→A→R 순) |
| 그룹 안 순서 | 지금처럼 `position`(만든 순 + 끌어서 바꾼 순서) |
| 빈 그룹 | 숨김 |
| 소속 이름 | 그룹 머리와 겹치므로 줄마다 붙던 PARA 이름(`badge`)은 Inbox에서 더 안 보인다 |
| 접힘 기억 | 그룹별로 이 브라우저 `localStorage`(`plan0.inboxCollapsed`)에 — Inbox 열림 상태와 같은 방식 |
| 새로 적기 | Inbox 입력창으로 추가하면 미분류에 들어간다. 미분류가 접혀 있으면 펼친다(방금 쓴 게 안 보이지 않게) |

### 2-1. 다른 그룹으로 끌어 놓기 (시안 ④)

| 항목 | 규칙 |
|---|---|
| 동작 | Inbox 카드를 다른 그룹(머리 또는 그 그룹의 카드 위)에 놓으면 **그 PARA로 매핑**하고 그 그룹 **맨 끝**으로. 미분류에 놓으면 매핑 해제 |
| 같은 그룹 | 지금처럼 순서 변경 |
| 표시 | 놓을 그룹 전체를 카테고리 틴트로 칠하고, 개수 자리에 "여기로 옮기기", 펼친 그룹이면 맨 끝에 카테고리 색 2px 선. 다른 그룹 카드는 자리를 비키지 않는다(맨 끝으로 가니까) |
| 접힌 그룹 | 머리 위에 놓아도 된다 |
| 노트 | 미분류의 노트를 PARA 그룹에 놓으면 매핑되면서 Inbox에서 빠진다(PARA 자료 쪽 스크랩) — PARA 카드에 끌어 놓을 때와 같은 기존 규칙 |
| PARA 상세 목록에서 끌어 온 카드 | 놓은 그룹의 PARA가 된다(미분류 = 지금처럼 매핑 해제) |
| 캘린더 블록 | 지금 그대로 — 어디에 놓든 날짜만 빠지고 PARA는 유지(실수로 PARA가 지워지지 않게). 그룹 표시도 안 함 |

## 3. 구현

DB 변경 없음.

1. `src/lib/inbox-groups.ts` — `groupInboxItems()`(묶기 · 순서), `inboxGroupKey()`, `mappingOfGroup()`,
   접힘 상태 `useInboxCollapsed()`(localStorage).
2. `src/lib/dnd/drop-targets.ts` — 드롭 대상 `{ type: "inbox-group"; kind; id }` 추가.
3. `src/lib/dnd/collision.ts` — 카드와 그룹이 겹치면 카드 우선.
4. `src/lib/dnd/handle-drop.ts` — Inbox · PARA 상세 카드를 Inbox 그룹(머리 · 다른 그룹 카드)에 놓으면 매핑 + 맨 끝.
5. `src/components/shell/inbox-panel.tsx` — 그룹 머리 · 접기 · 그룹별 `SortableContext`(다른 그룹 카드가 비키지 않는
   정렬 전략) · 끌기 표시. `TodoCard`에 `badge`를 넘기지 않는다. 할 일 상세 팝업은 패널이 연다(`onOpenDetail` →
   `TodoDetailById`) — 팝업에서 PARA를 바꾸면 카드가 다른 그룹으로 옮겨 다시 마운트되므로 카드 안에 두면 팝업이 닫힌다.
6. 문서 — DESIGN.md(3 · 5번 Inbox), FEATURES.md, HANDOFF.md.

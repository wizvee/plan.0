# 현재 기능 목록 (FEATURES)

2026-10-01 기준(애플 스타일 리디자인 + 하위 할 일 + 회고 + 메모 줄 표시 + 검색 + Inbox PARA 그룹 반영), 코드에 실제로 구현돼 있는 사용자 기능을 화면별로 정리한 문서입니다.
새 UI 시안을 그리거나 리디자인할 때 **빠뜨린 기능이 없는지 대조하는 체크리스트**로 씁니다.
개념/기획은 [PLANNING.md](./PLANNING.md), 결정 이력은 [HANDOFF.md](./HANDOFF.md),
시각 규칙은 [DESIGN.md](./DESIGN.md) 참고.

맨 아래 [부록](#부록-2026-09-27-apple-스타일-시안-대조표)에 2026-09-27 Apple 스타일 시안
(https://claude.ai/artifact/EAnz3ttkMqj676NhTXjP7b)과의 대조 결과가 있습니다.

## 1. 인증 · 계정

| # | 기능 | 위치 (코드) |
|---|---|---|
| A1 | 이메일/비밀번호 로그인. 가입 버튼은 의도적으로 숨김 | `app/login/page.tsx` |
| A2 | 로그아웃 — 레일 하단 아바타(모바일 "계정" 탭) → 계정 메뉴 | `shell/account-menu.tsx`, `lib/app-data/use-sign-out.ts` |
| A3 | 계정 표시 — 이메일 앞 2글자 이니셜 아바타(레일) + 계정 메뉴의 이메일 | `shell/app-rail.tsx`, `shell/account-menu.tsx` |
| A4 | **Google Drive 연결** — 미연결이면 아바타에 주황 점, 계정 메뉴의 "연결" · PARA 자료 탭 안내의 "Google Drive 연결". 연결 후 누른 화면으로 복귀 | `shell/account-menu.tsx`, `para/container-detail-screen.tsx`, `api/auth/google` |
| A5 | **Google Drive 연결 상태 + 재연결** — 계정 메뉴에 "연결됨" + 재연결 버튼 | `shell/account-menu.tsx` |
| A6 | Drive 연결 결과 배너 — 연결됨 / refresh token 없음 / 실패, 닫기 가능 (어느 화면이든 본문 상단) | `shell/drive-status-banner.tsx` |

## 2. 내비게이션 · 레이아웃

| # | 기능 | 위치 |
|---|---|---|
| N1 | 목표 · 캘린더 · PARA 이동 + 검색 열기(레일, 모바일 하단 탭). "캘린더"는 항상 이번 주 주 보기로, "목표"는 이번 주 목표로 | `shell/app-rail.tsx` |
| N2 | 브랜드 마크 (레일 맨 위 체크 아이콘) | `shell/app-rail.tsx` |
| N3 | "+" 버튼 (캘린더 툴바) — Inbox를 열고 입력창에 포커스 | `calendar-header.tsx`, `lib/shell-ui.tsx` |
| N4 | **미니 캘린더** — 캘린더 제목("2026년 9월 ⌄")을 누르면 팝오버. 이전/다음 달, 날짜 → 그 주, 월 라벨 → 월 보기, 보는 주 강조 | `mini-calendar.tsx`, `calendar-header.tsx` |
| N5 | 모바일 하단 탭바 6칸 (목표 / 캘린더 / PARA / 검색 / Inbox / 계정) + Inbox 탭 → 바텀시트. Inbox 열림 상태는 기억됨 | `shell/app-rail.tsx`, `shell/inbox-panel.tsx` |
| N6 | 화면 상태가 URL에 저장됨 (`?week=` — 캘린더 · 목표, `?view=month&month=`, `?kind=`, `?tab=`) — 뒤로가기로 복원 | 각 화면 |

## 3. 할 일 보관함 (Inbox / Todo List)

| # | 기능 | 위치 |
|---|---|---|
| I1 | 보관함(Inbox) 목록 — 날짜 없는 할 일 + 어디에도 매핑 안 된 노트. 데스크톱은 본문을 밀어내는 패널 | `shell/inbox-panel.tsx`, `lib/types.ts` `isInboxVisible` |
| I2 | 인라인 추가 입력창 | `add-todo-form.tsx` |
| I3 | **할일/노트 전환 토글** (추가 입력창 오른쪽) | `add-todo-form.tsx` |
| I4 | 항목 종류별 표시 — 할 일은 체크박스, 노트는 노트 아이콘(체크박스 없음) | `todo-card.tsx` |
| I5 | 완료 체크 | `todo-card.tsx` |
| I6 | 드래그 핸들 · 보관함 안 순서 변경(같은 PARA 그룹 안) | `todo-card.tsx`, dnd-kit |
| I7 | 보관함 → 캘린더 드래그로 날짜·시간 배치 (15분 스냅, 기본 1시간) | `week-board.tsx` |
| I8 | 캘린더 → 보관함 드래그로 배치 해제 (Inbox를 연 상태에서, 드래그 중 강조) | `shell/inbox-panel.tsx`, `lib/dnd/handle-drop.ts` |
| I9 | 보관함 → PARA 카드/상세 화면 드래그로 매핑 | `para-board.tsx`, `container-detail-screen.tsx` |
| I10 | 카테고리 색 점 (PARA 배지가 없을 때만) | `todo-card.tsx` |
| I11 | PARA 배지 (소속 이름) — Inbox는 그룹 머리가 대신하므로 안 씀(I16) | `todo-card.tsx` `badge` |
| I12 | URL 칩 — 파비콘 + 도메인, 새 탭으로 열기 | `url-chip.tsx` |
| I13 | 예약 날짜 표시, 지난 날짜면 빨간색 (PARA Tasks 탭 등) | `todo-card.tsx` |
| I14 | 항목 텍스트 클릭 → 할 일 상세 팝업 (6번) | `todo-card.tsx` |
| I15 | **하위 할 일 진행률** — 원형 링 + `2/4` (하위가 있는 할 일만, 노트 제외) | `todo-card.tsx`, `subtask/subtask-progress.tsx` |
| I16 | **PARA별 그룹** — 미분류 → Project → Area → Resource(완료 · 보관은 맨 아래), 머리 = `⌄` + 카테고리 점 + 이름 + 개수, 눌러서 접기(이 브라우저에 기억). 새로 적으면 미분류를 펼침 | `shell/inbox-panel.tsx`, `lib/inbox-groups.ts` |
| I17 | **다른 그룹으로 끌어 놓기** — Inbox · PARA 상세 카드를 그룹 머리나 그 그룹 카드 위에 놓으면 그 PARA로 매핑 + 맨 끝(미분류 = 매핑 해제). 놓을 그룹 틴트 + "여기로 옮기기" + 끝 선. 캘린더 블록은 PARA를 안 바꿈 | `lib/dnd/handle-drop.ts`, `shell/inbox-panel.tsx` |

## 4. 캘린더 — 주 보기

| # | 기능 | 위치 |
|---|---|---|
| W1 | 월~일 7일 × 0~24시 시간 그리드, 처음 열 때 오전 7시로 스크롤 | `week-calendar.tsx` |
| W2 | 헤더 — 주차 번호("39주") + 기간 | `week-board.tsx` |
| W3 | 이전 / 오늘 / 다음 (주 보기는 주 단위, 월 보기는 달 단위) | `calendar-header.tsx` |
| W4 | 오늘 날짜 강조 + 현재 시각 선 (클라이언트에서만 계산) | `week-calendar.tsx`, `lib/use-today.ts` |
| W5 | 일정 블록 — 카테고리 색, 제목 + 시간 범위, 짧으면 한 줄 compact | `calendar-block.tsx` |
| W6 | 블록 안 **완료 체크박스**, 완료 시 muted + 취소선 | `calendar-block.tsx` |
| W7 | 블록 드래그로 다른 요일/시간 이동 — **완료된 할 일은 옮길 수 없음**(완료를 풀면 다시 가능) | `calendar-block.tsx` |
| W8 | 블록 하단 모서리 드래그로 소요 시간 조절 | `calendar-block.tsx` |
| W9 | 블록 어디를 눌러도 상세 팝업 (체크박스 · 하위 할 일 동그라미 · 크기 조절 손잡이 제외, 4px 이상 움직이면 드래그) — 겹친 블록의 제목이 가려져도 보이는 부분으로 열 수 있게 | `calendar-block.tsx` |
| W10 | 모바일: 요일+날짜 원형 스트립으로 하루씩 보기 + "39주 · 날짜 요일" 요약 줄 | `week-board.tsx` |
| W11 | 블록 **하위 할 일** — 제목 옆 `2/4`, 44px 이상이면 바닥 진행률 바, 남는 높이만큼 하위 목록(작은 원으로 바로 체크, 넘긴 항목은 화살표, 넘치면 "외 N개") | `calendar-block.tsx` |
| W12 | 겹치는 블록 — 애플 캘린더 방식: 안 겹치면 전체 너비, 아래 블록의 제목 · 시간 줄(≈40분)을 지나서 시작하면 안쪽에 쏙(왼쪽 9 · 오른쪽 7px, 흰 테두리), 그 안에서 시작하면 나란히 같은 너비. 블록 사이 3px | `lib/calendar-layout.ts`, `week-calendar.tsx` |
| W13 | 대표 사진 — 1시간 30분 이상 블록이면 사진 배경 + 흰 글씨(하위 목록 · 진행률 바 숨김), 짧으면 오른쪽 위 썸네일, 한 줄 블록엔 없음 | `calendar-block.tsx` |

## 5. 캘린더 — 월 보기

| # | 기능 | 위치 |
|---|---|---|
| M1 | 7×5~6 월 그리드, 칸마다 최대 2개 + "+N개 더보기" | `month-calendar.tsx` |
| M2 | 이전 달 / 다음 달 / 오늘 | `month-calendar.tsx` |
| M3 | 날짜 칸 클릭 → 그 주의 주 보기 | `month-calendar.tsx` |
| M4 | 일정 칩 클릭 → 상세 팝업 | `month-calendar.tsx` |
| M5 | 주/월 전환: 툴바 오른쪽 보기 드롭다운, 또는 미니 캘린더 월 라벨 | `calendar-header.tsx` |
| M6 | 일정 칩에 하위 할 일 `2/4` | `month-calendar.tsx` |
| M7 | 사진 있는 날 — 그날 가장 이른 할 일의 대표 사진이 칸 전체 배경(위쪽 어둡게 + 흰 글씨) | `month-calendar.tsx` |

## 6. 할 일 상세 팝업

| # | 기능 | 위치 |
|---|---|---|
| D1 | 제목 편집 | `todo-detail-modal.tsx` |
| D2 | PARA 매핑 속성 — 팝오버에서 검색 + 없음(해제) + 종류별 목록 | `todo-detail-modal.tsx` |
| D3 | 메모 편집 | `todo-detail-modal.tsx` |
| D4 | URL 입력/수정 + 새 탭 열기 | `todo-detail-modal.tsx` |
| D5 | 할 일 ↔ 노트 전환 (노트로 바꾸면 날짜·완료 초기화) | `todo-detail-modal.tsx` |
| D6 | 삭제 | `todo-detail-modal.tsx` |
| D7 | 완료 체크박스(제목 왼쪽) + 일정 줄(날짜 · 시간, 캘린더에 배치된 경우) | `todo-detail-modal.tsx` |
| D8 | **하위 할 일 체크리스트** — 체크 · 그 자리 수정(비우면 삭제) · × 삭제 · Enter로 연속 추가(한글 조합 안전) · 그립으로 순서 변경, `2/4 · 50%` + 진행률 바. 노트엔 없음 | `subtask/subtask-list.tsx`, `lib/app-data/subtask-actions.ts` |
| D9 | 팝업은 `document.body` 포털 — 어디서 열어도 캘린더 · Inbox 위에 뜸 | `todo-detail-modal.tsx` |
| D10 | **탭 구조** — 체크 · 제목 · 일정 · PARA는 고정, 아래는 하위 할 일(`2/4`) · 메모·URL(열린 질문 + 확인 합계 회색 뱃지, 없으면 내용 점) · 사진(개수) 탭. 완료된 할 일은 메모 탭, 미완료는 하위 할 일 탭으로 열림(검색 결과는 일치한 곳의 탭). 노트는 탭 없이 메모 · URL | `todo-detail-modal.tsx` |
| D11 | **회고 = 메모 줄** `[p]` 잘한 점 · `[c]` 아쉬운 점 · `[I]` 다음엔(툴바로 붙임). 완료했는데 메모가 비었으면 "끝낸 일, 돌아볼까요?" + 종류 버튼 3개 → 그 표시가 붙은 줄로 편집. 프로젝트에 매핑돼 있고 회고 줄이 있으면 "프로젝트 회고에도 모여요" | `todo-detail-modal.tsx`, `lib/retro.ts` |
| D12 | **다음 날로 넘기기** — 캘린더에 배치된 할 일의 안 끝난 하위 할 일을 다음 평일(이름 + PARA가 같은 할 일, 없으면 새로 만듦) 맨 위로 옮겨 적고, 원래 항목은 "넘김"(회색 화살표, 3/4 그대로)으로 남기며 이 할 일은 완료. 끝나는 시각 전엔 푸터 작은 "넘기기", 지나면(지난 날짜 포함) 큰 카드 | `todo-detail-modal.tsx`, `lib/carry-over.ts`, `lib/app-data/todo-actions.ts` |
| D13 | **사진** 탭 — 여러 장 올리기(브라우저에서 2048px · 640px JPEG로 줄여 Drive `PLAN.0/사진/<날짜> <이름>`에 저장), 3열 그리드, ★ 대표(없으면 첫 장), 누르면 크게 보기(대표로 · Drive에서 열기 · 삭제 = Drive 휴지통, ← → · Esc). Drive 미연결이면 연결 안내 | `photo/photo-tab.tsx`, `photo/photo-viewer.tsx`, `lib/supabase/photos.ts`, `app/api/photos/` |
| D14 | **하위 할 일 "나중에"** — 안 끝난 하위 할 일을 부모와 같은 PARA의 날짜 없는 할 일로 옮김(메모에 "L사 업무(9/30)에서 옮김", 넘김 기록 안 남김), 화면 아래 되돌리기 알림 5초 | `subtask/subtask-list.tsx`, `lib/app-data/todo-actions.ts` |
| D15 | **메모 줄 표시** — `- [ ]` 확인 · `- [?]` 질문 · `- [p]` 잘한 점 · `- [c]` 아쉬운 점 · `- [I]` 다음엔(예전 `☐` · `☑`도 읽음). 편집 칸 위 툴바 5개(커서 줄 · 선택한 줄들에 붙이기 · 바꾸기 · 같은 버튼으로 떼기), 표시 줄 끝 Enter로 같은 표시 이어 쓰기(빈 표시 줄에서 Enter면 떼기), ⌘Z 됨. 보기 모드에선 18px 아이콘 — 체크박스 누르면 `[x]`, `?` 누르면 답 입력칸(Enter → `[i]` + `→ 답`), `i` 누르면 질문으로 되돌리기. 줄을 누르면 그 줄 끝에서 원문 편집. 표시가 없는 메모는 전처럼 보임 | `memo/memo-editor.tsx`, `memo/memo-toolbar.tsx`, `memo/memo-view.tsx`, `lib/memo-marks.ts` |

## 7. PARA 목록

| # | 기능 | 위치 |
|---|---|---|
| P1 | Project / Area / Resource 세그먼트 전환 (`?kind=`) | `para-board.tsx` |
| P2 | 컨테이너 카드 그리드 — 완료 · 보관은 뒤로 + 시작일 순 정렬, 종류별 색 왼쪽 막대, 기간(Project: 시작일 – 마감일), 상태, 할 일 개수, 진행률(Project) | `container-card.tsx` · `para-board.tsx` |
| P3 | 새 컨테이너 만들기 | `add-container-form.tsx` |
| P4 | 카드 클릭 → 상세 화면 | `para-board.tsx` |
| P5 | 보관함 항목을 카드로 드래그해 매핑 (I9) | `para-board.tsx` |

## 8. PARA 상세

| # | 기능 | 위치 |
|---|---|---|
| C1 | 목록으로 돌아가기 (보던 종류 탭 유지) | `container-detail-screen.tsx` |
| C2 | 이름 클릭해서 편집 | `container-detail-screen.tsx` |
| C3 | 요약 줄 — Status 토글, Due date · Progress (Project만) | `container-detail-screen.tsx` |
| C4 | 탭: Overview / Tasks / 자료 (`?tab=`) | `container-detail-screen.tsx` |
| C5 | Overview — Start / Due / Completion date 편집, Days left (Project) | `container-detail-screen.tsx` |
| C6 | Tasks — 매핑된 할 일 목록 | `container-detail-screen.tsx` |
| C7 | 스크랩(매핑된 노트) 섹션 — 여러 개 골라 **Drive 노트로 승격**(원본은 삭제) | `scrap-section.tsx`, `api/drive/promote` |
| C8 | 자료 탭 — 컨테이너별 **Drive 폴더**의 파일 목록 (종류 아이콘, 수정일) | `files-tab.tsx`, `api/drive/folder`, `api/drive/files` |
| C9 | 자료 탭 — 파일 업로드 (드래그 앤 드롭 / 클릭) | `files-tab.tsx` |
| C10 | 자료 탭 — 새 마크다운 노트 + 인앱 편집기 (제목, 태그/링크 속성, 본문, 저장) | `files-tab.tsx`, `api/drive/notes` |
| C11 | 자료 탭 — md가 아닌 파일은 Drive에서 새 탭으로 열기 | `files-tab.tsx` |
| C13 | 자료 탭 — **Drive에서 가져오기**: Google Picker로 기존 Drive 파일을 골라 이 컨테이너 폴더로 가져옴 (`NEXT_PUBLIC_GOOGLE_API_KEY` 필요) | `files-tab.tsx`, `lib/google-picker.ts`, `api/drive/access-token`, `api/drive/import` |
| C12 | 상세 화면 전체가 드롭 영역 — 보관함에서 끌어오면 이 컨테이너로 매핑 | `container-detail-screen.tsx` |
| C14 | Tasks — 하위 할 일이 있으면 › 로 펼쳐 바로 체크 · 수정 · 추가 · 순서 변경 (펼침 상태는 저장 안 함) | `todo-card.tsx` `expandable` |
| C15 | **회고 탭(Project만, `?tab=retro`)** — 매핑된 할 일 · 노트 메모의 `[p]` `[c]` `[I]` 줄을 잘한 점 / 아쉬운 점 / 다음엔 3열로(최근 순). 줄을 누르면 그 할 일 상세의 메모 탭. 맨 위 입력 줄 = 프로젝트 전체 회고 → "〈프로젝트〉 회고" 노트(처음 쓸 때 만듦) 메모에 줄 추가 | `retro/project-retro-tab.tsx`, `lib/retro.ts` |
| C16 | 회고 탭 — "다음엔" 줄 **할 일로**: Inbox에 이 프로젝트로 매핑된 할 일 생성 + 메모 줄 끝에 ` → 할 일로 만듦`(회색 "할 일로 만듦" 표시) | `retro/project-retro-tab.tsx` |
| C17 | 회고 탭 — **회고 노트로 저장**: 종류별 마크다운을 채운 새 노트를 자료 탭 편집기로 열기(Drive 연결 시) | `retro/project-retro-tab.tsx`, `lib/retro.ts` `buildRetroMarkdown` |
| C18 | 할 일 탭 맨 위 **새 할 일** 줄 — 이 컨테이너에 매핑된 할 일 생성(날짜 없음 → Inbox에도 보임), Enter 연속 입력 · Esc 취소. 미완료는 최근 것이 위 | `para/add-mapped-todo-row.tsx`, `todo-actions.ts` `addToContainer` |
| C19 | 이름 옆 **`···` 메뉴** — 이름 바꾸기 · 완료로 표시(보관하기) · 삭제 | `para/container-menu.tsx` |
| C20 | **삭제** — 확인 창에서 기본 "함께 삭제"(매핑된 할 일 · 스크랩 · 하위 삭제 — 회고는 할 일 · 노트 메모 안이라 같이 — + Drive 폴더는 Drive 휴지통) 또는 "연결만 끊기". Drive 실패 시 다시 시도 / 폴더는 두고 삭제 | `para/delete-container-dialog.tsx`, `lib/app-data/container-actions.ts`, `api/drive/folder` `DELETE` |
| C21 | 삭제됐거나 없는 컨테이너 주소 → "찾을 수 없어요" + 목록으로 | `container-detail-screen.tsx` |
| C22 | **개요 탭 "남은 것"**(Project · Area · Resource) — 매핑된 할 일 · 노트 메모의 열린 `[ ]` · `[?]` 줄을 할 일별로. 칩 확인할 것 · 질문 + 끝난 것도 보기(`[x]` · `[i]`), 줄에서 바로 체크 · 해결, 누르면 그 할 일의 메모 탭. 10줄 + 더 보기, 없으면 카드 숨김 | `para/open-marks-card.tsx`, `search/mark-chips.tsx` |

## 9. 화면이 없는 기능

| # | 기능 | 위치 |
|---|---|---|
| X1 | 애플 단축어 "공유하기 → 스크랩" API — 보관함에 URL 항목 생성 | `api/clip/route.ts` |
| X3 | 백틱으로 감싼 `VAR`는 인라인 코드로 표시 — 할 일 · 하위 할 일 · 메모 · 스크랩 · PARA 이름. 편집 칸은 누르면 원문으로 바뀜 | `inline-text.tsx` |
| X2 | Supabase Realtime으로 여러 기기 실시간 동기화 (하위 할 일 포함) | `lib/supabase` 훅 |


## 10. 주간 목표 (GOALS-PLAN.md)

| # | 기능 | 위치 |
|---|---|---|
| G1 | **레일 맨 위 "목표" + 진행률 링** — 이번 주 목표별 진행률의 평균, 어느 화면에서든 보임. 목표 없으면 점선, 100%면 체크 | `shell/app-rail.tsx`, `goals/goal-ring.tsx` |
| G2 | 목표 화면(`/goals?week=`) — "이번 주 목표" · 주 이동 `‹ 이번 주 ›` · 요약 줄(% · 연결된 할 일 N개 중 M개) | `goals/goals-screen.tsx` |
| G3 | 목표 카드 — 진행률 링(PARA 색, `2/4`) · 이름 눌러서 수정 · PARA 칩으로 변경 · `···`(이름 바꾸기 · 삭제, 할 일은 남음) | `goals/goal-card.tsx` |
| G4 | 연결된 할 일 목록 — 체크 · 요일/시각(다른 주면 날짜, 캘린더에 안 올렸으면 Inbox) · × 목표에서 빼기. 없으면 "아직 캘린더에 시간이 안 잡혔어요" | `goals/goal-card.tsx` |
| G5 | "+ 새 할 일" — 목표 + 목표의 PARA가 붙은 할 일을 Inbox에(연속 입력) | `goals/goal-card.tsx`, `app-data/goal-actions.ts` |
| G6 | "이번 주 할 일 연결" — 그 주 캘린더 할 일을 요일별로 체크(검색, 다른 목표 것은 옮겨짐, 같은 이름 3일 이상 · 노트 제외) | `goals/goal-link-popover.tsx`, `lib/goals.ts` |
| G7 | Inbox 항목을 목표 카드로 끌어다 놓으면 연결(할 일에 PARA가 없으면 목표의 PARA로) | `lib/dnd/handle-drop.ts` |
| G8 | "목표 추가" — 3개 이하 권장 안내(막지 않음). 목표가 없는 주는 목표 적기 + 좋은 목표 확인 질문 3개 + 지난주 요약 | `goals/goals-screen.tsx` |

---

## 11. 검색 (SEARCH-PLAN.md)

| # | 기능 | 위치 |
|---|---|---|
| S1 | **검색 패널 열기** — ⌘K / Ctrl+K(한글 입력 중에도) · 레일 "검색"(PARA와 Inbox 사이) · 모바일 탭바 "검색". 데스크톱은 가운데 팝업, 모바일은 전체 화면(취소). 검색어 · 칩은 닫았다 열어도 남음 | `shell/search-panel.tsx`, `lib/shell-ui.tsx` |
| S2 | **키워드 검색** — 할 일 제목 · 메모(줄마다) · URL · 하위 할 일 · PARA 이름. 조사 떼기(`성능은` → `성능`), 하이픈 · 밑줄 무시(`cids` = `CI-DS`), 단어 절반 이상 일치, 점수(줄 ×3 · 제목 ×2 · PARA ×1) 같으면 최근 순. 서버 · DB 없이 브라우저에서 | `lib/search.ts`, `lib/app-data/use-search.ts` |
| S3 | **결과 카드** — 할 일 하나 = 카드 하나(일치한 하위 할 일 · 메모 스니펫 · URL). 일치 단어 옅은 주황, 메모 `[i]`의 답 · 하위 할 일 📝 뒤는 진하게, 짧은 메모는 전체(가장 잘 맞는 줄 굵게) · 긴 메모는 앞뒤 1줄. 맥락 줄(날짜 · 부모 할 일 · PARA · URL 도메인) + 출처 칩. 처음 30개 + 더 보기 | `search/search-result.tsx` |
| S4 | **PARA 칸** — 이름에 검색 단어가 있는 PARA를 결과 위에, 누르면 상세 화면 | `search/search-result.tsx`, `shell/search-panel.tsx` |
| S5 | **이모지만 · 줄 표시 검색** — `📝`만 치면 그 이모지가 들어간 줄 전부, `[?]` · `[ ]` 등을 치면 그 표시가 붙은 메모 줄 전부(최근 순). 다른 단어를 같이 치면 그 안에서 좁힘 | `lib/search.ts` |
| S6 | **칩 `확인할 것 N` · `질문 N`**(메모 줄 표시 모아보기) — 열린 `[ ]` · `[?]` 줄을 할 일별로 묶어서. 줄에서 바로 체크 · 질문 해결(답 입력) · `i` 되돌리기, "끝난 것도 보기" | `shell/search-panel.tsx`, `search/search-result.tsx` |
| S7 | **결과 열기** — 검색 패널 위에 할 일 팝업(메모 · URL로 찾았으면 메모 탭, 하위 할 일이면 하위 할 일 탭), 닫으면 검색으로 돌아와 검색어 칸 포커스 | `todo-detail-by-id.tsx`, `todo-detail-modal.tsx`(`initialTab`) |
| S8 | 키보드 — ↑↓ 고르기 · Enter 열기 · Esc 닫기(팝업이 열려 있으면 팝업만) | `shell/search-panel.tsx` |

## 부록: 2026-09-27 Apple 스타일 시안 대조표

> 기록용 — 첫 시안(v1)을 평가한 당시의 표입니다. 여기서 지적한 누락(계정 · Drive · 미니 캘린더 · 노트 토글 등)은 시안 v2와 6단계 구현에서 반영됐습니다.

시안 보드: ① 주 보기 ② Inbox 열림 ③ 월 보기 + 드롭다운 ④ 팔레트.
시안이 캘린더 화면 데스크톱만 그렸으므로 PARA · 모바일 · 상세 팝업은 "그리지 않음"으로 분류합니다.

범례: ✅ 반영 · △ 일부만 / 암시만 · ✕ 빠짐 · — 이번 시안 범위 밖

### 캘린더 화면에서 빠졌거나 부족한 것 (시안 수정 필요)

| # | 기능 | 판정 | 비고 |
|---|---|---|---|
| A2 | 로그아웃 | ✕ | 레일 하단 아바타만 있고 동작 없음 |
| A3 | 이메일 · 이니셜 | △ | 이니셜 없는 기본 아바타 |
| A4 | Google Drive 연결 | ✕ | **고려 안 됨** |
| A5 | Drive 연결 상태 · 재연결 | ✕ | **고려 안 됨** |
| N2 | 브랜드 | △ | "p." 마크만 |
| N3 | + 새 할 일 | △ | 툴바에 + 버튼은 있지만 무엇을 하는지 미정 |
| N4 | 미니 캘린더 | ✕ | **통째로 빠짐** — 날짜 점프 · 주 강조 기능이 사라짐 |
| I3 | 할일/노트 전환 토글 | ✕ | 입력창에 토글 없음 |
| I4 | 노트 표시 | ✕ | 모든 항목을 체크박스 할 일로 그림 |
| I6 | 드래그 핸들 · 순서 변경 | △ | grab 커서 + 하단 안내 문구뿐 |
| I8 | 캘린더 → 보관함 되돌리기 | △ | Inbox를 연 상태에서 드롭 — 드롭 중 강조 표시만 시안에 없음 |
| I12 | URL 칩 | ✕ | |
| W2 | 주차 + 기간 | △ | "39주"는 있고 기간(9.21–27)은 빠짐 |
| W6 | 블록 완료 체크박스 | ✕ | 블록에 체크박스 없음 |
| W8 | 리사이즈 | △ | 호버 때만 보이는 것이라 정적 시안에선 판단 보류 |
| W9 · M4 · I14 | 상세 팝업 진입 | △ | 클릭 커서만, 팝업은 안 그림 |
| M1 | 월 칸 최대 개수 | △ | 시안은 3개, 코드는 2개 — 둘 중 하나로 맞춰야 함 |

### 반영된 것

N1(캘린더/PARA 메뉴 — 단 시안에서 PARA 버튼은 동작 안 함), I1, I2, I5, I7(안내 문구), I10, I11(Inbox 항목 아래 컨테이너 이름),
W1, W3, W4, W5, W7, M1, M2, M3(동작 암시 없음), M5 → **월/주 드롭다운으로 대체(개선)**.

### 그리지 않은 것 (범위 밖)

A1 로그인, A6 Drive 배너, N5 · W10 모바일, D1–D6 상세 팝업, P1–P5 PARA 목록, C1–C12 PARA 상세(Drive 자료 탭 포함), X1–X2.
이 중 **A6 · C7–C11은 Drive 연결(A4/A5)이 전제**라서, 연결 진입점이 사라지면 PARA 자료 탭 전체가 쓸 수 없게 됩니다.

### 시안에만 있고 앱에는 없는 것 (새로 넣을지 결정 필요)

| 항목 | 설명 |
|---|---|
| 검색 버튼 | 레일 하단 — 검색 기능 자체가 앱에 없음 |
| 종일(All-day) 행 | 앱 데이터 모델에 "종일" 개념이 없음 (`scheduled_date` + 시작 시간 구조) |
| ⌘1 / ⌘2 단축키 표시 | 단축키 미구현 |
| Inbox 개수 빨간 배지 | 새 요소 (구현 쉬움) |
| 오늘 빨간 원 | DESIGN.md는 primary로 정해져 있음 — 바꾸면 문서도 수정 |

### 구조적으로 짚어야 할 점

1. **레일 + Inbox 패널은 모든 화면 공통 컴포넌트 하나**(지금의 `AppSidebar`와 같은 원칙). 화면마다
   다르게 그리거나 기본 상태를 다르게 두지 않는다. 캘린더 → 보관함 되돌리기(I8), PARA 카드 매핑(I9)은
   어느 화면에서든 Inbox를 열고 드래그하면 되므로 별도 처리가 필요 없다.
2. **계정 · Drive 메뉴 자리.** 레일 하단 아바타를 누르면 뜨는 팝오버(이메일 / Drive 연결 상태 · 연결 ·
   재연결 / 로그아웃)로 A2–A5를 모으는 안을 제안합니다. Drive 미연결이면 아바타에 작은 경고 점.
3. **미니 캘린더 자리.** 툴바의 "2026년 9월" 제목을 누르면 미니 캘린더 팝오버(Apple 캘린더 방식) 또는
   Inbox 패널 상단에 접이식으로 두는 안 중에서 골라야 합니다.

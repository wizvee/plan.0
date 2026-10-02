# 바깥 링크 — 메모 · 하위 할 일의 마크다운 링크

작성 2026-10-02. 시안: https://claude.ai/artifact/PTUfxPwAQ2usF9UeeRaCdj (① A · B · C안 · ④ 하위 할 일 · ⑤ 붙여넣기 · ⑥ 다른 화면)

> **상태: 시안 A안 컨펌 · 할 일 제목은 빼기로(2026-10-02 사용자 결정) → 구현 완료.**

## 1. 왜

SAP 노트처럼 확인할 문서를 메모 줄에 `[Update HANA Cloud Root Certificate …](https://me.sap.com/notes/0003797531) 확인`으로 적는데,
글자로만 보여서 긴 주소가 줄을 차지하고 누를 수도 없다. 할 일마다 URL 칸은 하나뿐이라 줄마다 다는 링크는 메모 · 하위 할 일에 적는다.

## 2. 규칙

| 항목 | 규칙 |
|---|---|
| 문법 | 마크다운 `[이름](https://…)` + 그냥 붙여넣은 주소 `https://…`. `http` · `https`만(`javascript:` 등은 글자 그대로). 저장은 원문 그대로 — DB 변경 없음, Drive 노트 · 옵시디언에서도 링크 |
| 대상 | **메모 · 하위 할 일만.** 할 일 제목은 링크로 읽지 않는다(사용자 결정 — 제목은 캘린더 · Inbox 어디서나 카드 전체가 버튼) |
| 모양 (A안) | 파란 글자(`text-primary`, 500) + 끝에 작은 `↗`(`ArrowUpRight`, 마지막 단어와 같이 줄바꿈), hover 밑줄, 새 탭. 앱 안 링크 `[[ ]]`는 `↗` 없음 — "앱 안에서 열림 / 밖으로 나감" 구분 |
| 그냥 주소 | `https://` · `www.` · 끝 `/`를 떼고 28자에서 자른다(`help.sap.com/docs/SAP_DATAS…`), 툴팁에 전체 주소. ASCII까지만 주소(`https://a.com에서` → `a.com` + `에서`), 끝 문장 부호 · 짝 없는 `)`는 뺀다 |
| 취소선 줄 | 완료한 하위 할 일 · 확인한 메모 줄 안의 링크는 파랑 대신 그 줄의 회색(`[.line-through_&]:text-current`) |
| 누를 수 있는 곳 | 할 일 팝업의 메모 보기(`MemoView`) · 하위 할 일 목록(`SubtaskList`). 링크 클릭은 위로 안 올려서 줄 편집으로 안 들어간다 — 편집은 링크 밖을 누른다 |
| 이름만 | 줄 전체를 누르는 곳 — 주 보기 블록 하위 목록 · 검색 결과(메모 줄 · 하위 할 일 · 답) · PARA "남은 것" · 프로젝트 회고 · 하위 할 일 끄는 미리보기 · "나중에" 알림 |
| 입력 | 편집 칸(메모 · 하위 할 일 추가 · 하위 할 일 수정)에서 **글자를 고른 채 주소를 붙여넣으면** `[고른 글자](주소)`(⌘Z 됨). 고른 글자가 없거나 · 여러 줄 · 대괄호가 있거나 · 그 자체가 주소면 평소 붙여넣기. 메모 편집 칸 아래 안내 문구에 한 줄 추가 |
| 인라인 코드 | 백틱 안은 링크로 읽지 않는다(코드가 먼저) |

## 3. 구현

| 파일 | 내용 |
|---|---|
| `lib/web-links.ts` | 순수 함수 — `splitWebLinks` · `hasWebLinks` · `stripWebLinks`(이름만) · `shortUrl` · `isWebUrl` · `linkFromPaste` |
| `lib/paste-link.ts` | 입력칸 `onPaste` — `pasteAsLink` |
| `components/inline-text.tsx` | `InlineText`에 `links` — `"open"`(누를 수 있는 `WebLink`) / `"label"`(이름만) / 없음(원문, 제목) |
| `memo/memo-link.tsx` | `LinkedText` 글자 조각에 `links="open"`(링크 찾기가 없으면 `"label"`) |
| `subtask/subtask-list.tsx` | 링크가 든 줄은 버튼 대신 누르면 편집되는 묶음(`<a>`를 `<button>` 안에 넣을 수 없어서), 입력칸 2개에 `pasteAsLink` |
| `todo-detail-modal.tsx` | 바깥 링크만 있는 메모도 보기 모드(`MemoView`)로 |
| `search/search-result.tsx` · `calendar-block.tsx` · `retro/project-retro-tab.tsx` | 이름만 |
| `scripts/check-web-links.ts` | 규칙 확인(`npx tsx`) |

## 4. 남은 것

- 시안 ⑥의 검색 결과 맥락 줄 도메인(`· me.sap.com`)은 안 넣었다.
- "나중에" · 회고 "+ 할 일로"처럼 하위 할 일 · 메모 줄이 **할 일 제목**이 되면 `[이름](주소)` 원문이 제목에 그대로 보인다(제목은 링크로 안 읽으므로).
  필요해지면 옮길 때 링크를 이름으로 바꾸고 주소는 URL 칸으로 옮기는 방법이 있다.

# 할 일 사진 계획

작성 2026-09-29. 시안: https://claude.ai/artifact/4pamL9JChaBcYvJZXvfe2c (① 월 보기 full · ② 주 보기 bg · ③ 상세 팝업 사진 탭)

> **상태: 시안 컨펌(월 full · 주 bg) → 구현 완료 → 마이그레이션 실행 · `main` 머지 (2026-09-29).**
> 남은 것: 실제 Drive 계정으로 올리기 · 보기 · 지우기 확인.

## 1. 왜

이 앱을 업무 계획뿐 아니라 **삶의 기록**으로도 쓰고 싶다. 약속 · 나들이처럼 특별한 일정엔 보통 사진을 찍으니,
할 일에 사진을 붙이고 캘린더에서 그 사진이 보이면 추억이 되고 다이어리 꾸미기 느낌도 난다.
(여러 날 일정 · 종일 일정은 이번 범위에서 뺐다 — 2026-09-29 사용자 결정.)

## 2. 규칙 (2026-09-29 사용자 확정)

| 항목 | 규칙 |
|---|---|
| 붙는 곳 | **할 일(task)**. 상세 팝업 네 번째 탭 **"사진 N"** (하위 할 일 · 회고 · 메모·URL 옆) |
| 대표 사진 | ★ 하나. 따로 안 고르면 먼저 올린 사진. 사진을 누르면 크게 보기 · 대표로 · 삭제 · Drive에서 열기 |
| 저장 | **Google Drive** — `PLAN.0 / 사진 / 2026-09-19 새별오름` (날짜 + 할 일 이름, 날짜 없으면 이름만). 썸네일은 `PLAN.0 / 사진 / .thumbs`. 이름을 바꾸기 전의 `plan.0` 폴더가 있으면 다음에 사진을 올릴 때 이름만 `PLAN.0`으로 바꿔 계속 쓴다 |
| 올릴 때 | 브라우저에서 긴 변 **2048px JPEG**(원본용) + **640px JPEG**(캘린더용 썸네일)로 줄여 둘 다 올린다. 아이폰 HEIC는 사진 보관함에서 고르면 iOS가 JPEG로 바꿔준다 |
| DB | `todo_photos` — Drive 파일 id(원본 · 썸네일) · 폴더 id · 대표 여부만. 사진 자체는 DB에 없다 |
| 보여줄 때 | `/api/photos/<id>?size=thumb|full`이 이 사용자의 Drive에서 읽어 그대로 내려준다(브라우저 캐시 1년 — 파일이 안 바뀌므로). Drive 링크가 만료되는 문제 없음 |
| 월 보기 | **full** — 그날 할 일 중 **가장 이른 할 일의 대표 사진**을 칸 전체 배경으로. 위쪽을 어둡게 덮고 흰 글씨 |
| 주 보기 | **bg** — **1시간 30분 이상** 블록이면 사진 배경 + 흰 글씨(하위 목록 · 진행률 바는 숨김, `2/4`는 유지). 짧으면 오른쪽 위 작은 썸네일. 한 줄짜리(compact) 블록엔 없음 |
| Drive 미연결 | 사진 탭은 연결 안내(PARA 자료 탭과 같은 모양). 캘린더의 사진은 못 불러오면 조용히 평소 모양으로 |
| 할 일 삭제 | DB 행은 같이 지워지고(cascade) **Drive 사진은 남는다** — 기록이라 실수로 날리지 않게 |
| 사진 삭제 | 원본 · 썸네일을 Drive 휴지통으로(30일 안 복구 가능) + DB 행 삭제 |

## 3. 구현

- DB: `supabase/migrations/20260929_todo_photos.sql` — `todo_photos`(RLS · Realtime · 할 일당 대표 하나 부분 unique 인덱스).
- 서버: `POST /api/photos`(업로드: 폴더 찾기/만들기 → 원본 · 썸네일 업로드 → 행 추가),
  `GET /api/photos/[id]`(Drive에서 읽어 내려주기), `DELETE /api/photos/[id]`(휴지통 + 행 삭제).
  Drive 함수는 `lib/google-drive.ts`(`ensurePhotoFolder` · `ensurePhotoThumbFolder` · `getFileBytes`).
- 데이터: `lib/supabase/photos.ts`(조회 · Realtime · 업로드 · 삭제 · 대표 지정) → `AppDataProvider` → `usePhotos()`
  (`photosOf` · `coverOf`). 줄이기 · 주소는 `lib/photos.ts`.
- 화면: `components/photo/photo-tab.tsx`(그리드 · 추가 · 미연결 안내) · `photo-viewer.tsx`(크게 보기),
  `todo-detail-modal.tsx`(탭), `calendar-block.tsx`(배경 · 썸네일), `month-calendar.tsx`(칸 배경).

# 작업 인계 노트 (HANDOFF)

새 세션(로컬 Claude Code 등)에서 이 프로젝트를 이어받을 때 읽는 문서입니다.
"기획서"는 [PLANNING.md](./PLANNING.md), "설정/실행 방법"은 [README.md](./README.md)에 있고,
이 문서는 **그 사이의 맥락 — 왜 지금 이 모습이 됐는지, 무엇이 아직 안 끝났는지**를 정리합니다.

## 작업 방식 (사용자 지시, 2026-09-12 — 항상 지킬 것)

- **UI는 코드로 바로 만들지 않는다.** 화면/레이아웃이 필요한 작업은 먼저 HTML 목업이나 Figma로
  만들어서 사용자에게 컨펌받은 뒤에만 실제 코드(컴포넌트) 작업을 진행한다.
- 기능 기획도 UI/데이터 모델 얘기로 서두르지 말고, **개념(무엇을 왜 하는지)부터 사용자와 명확히
  합의**한 다음에 세부 설계로 넘어간다. (PARA 기획 때 UI부터 앞서갔다가 되돌아온 적 있음 — PLANNING.md
  8번 섹션 참고.)

## 저장소 / 브랜치

- repo: `wizvee/plan.0`
- 지금까지 작업한 브랜치: `claude/weekly-todo-webapp-plan-hx1le7`
- 로컬로 가져오기:
  ```bash
  git clone https://github.com/wizvee/plan.0.git
  cd plan.0
  git checkout claude/weekly-todo-webapp-plan-hx1le7
  npm install
  ```
- 이 브랜치를 계속 쓸지, main으로 머지/새 브랜치로 옮길지는 사용자가 로컬에서 정하면 됩니다 (아직 PR 안 만듦).

## 프로젝트가 무엇인지 (한 줄 요약)

개인용 주간 할 일 관리 웹앱. Todo 목록에 할 일을 적어두고, 드래그 앤 드롭으로 Mon~Sun 요일에 배치.
Apple 미리알림(Reminders) 느낌의 UI. Supabase로 로그인 + 여러 기기 실시간 동기화.

## 지금까지의 의사결정 흐름 (시간순)

대화가 길어서 결론만 아는 게 중요합니다. 각 결정은 되돌리지 않는 한 유효합니다.

1. **기본 개념**: Todo List(요일 미지정 보관함) + Mon~Sun 7일. 보관함은 **주차와 무관하게 전역**으로 유지되고,
   Mon~Sun 칸의 내용만 보고 있는 주차에 따라 바뀜. (`week_start` 컬럼으로 구분)
2. **완료 체크박스**, **주차 이동 네비게이션**(`< 37주 >` + "이번 주" 버튼) 추가 확정.
3. **저장 방식**: 로컬 1기기 전용(localStorage) 대신 **여러 기기 동기화**를 선택 → Supabase(Postgres + Auth) +
   Vercel 무료 배포 조합으로 결정 (개인용으로 완전 무료 운영 가능).
4. **UI 프레임워크**: shadcn/ui + Tailwind 사용하기로 확정.
   (이 환경 네트워크 정책상 `ui.shadcn.com`이 막혀서 `shadcn init` CLI를 못 썼고,
   `components.json`/테마/기본 컴포넌트를 shadcn 표준 출력과 동일하게 손으로 작성함 — 결과물은 동일.)
5. **레이아웃 변천사**:
   - 처음: Todo List + Mon~Sun 8칸을 한 줄로
   - → 사용자가 원본 레퍼런스 이미지처럼 **4x2 그리드**(1줄에 4칸씩, 2줄)로 변경 요청 → 적용
   - → 모바일에서는 4x2/2x4가 답답해서, **요일 탭으로 하나씩 보기** 방식으로 변경
     (`[+ ] 월 화 수 목 금 토 일` 탭, 선택한 칸만 보임)
   - → **(최신)** Google Calendar 스크린샷을 레퍼런스로, **Todo List를 메인 그리드에서 완전히 분리**해서
     오른쪽 끝 고정 **아이콘 레일**(지금은 체크 아이콘 하나) + 체크 아이콘을 누르면 열리는 **슬라이드 패널**로 이동.
     메인 화면은 **Mon~Sun만 한 줄**(`grid-cols-7`)로 남음. 모바일 요일 탭에서도 "+"(Todo List) 탭은 사라짐.
6. **디자인 스타일**: 처음엔 기본 shadcn 뉴트럴 테마 → "너무 기본적이다"는 피드백 → Claude Design 캔버스로
   3가지 방향(웜 에디토리얼 / 볼드 프로덕티비티 / 소프트 플레이풀) 시안을 만들어 제안 →
   사용자가 **"Apple 미리알림(Reminders)과 비슷한 느낌"**을 요청 → iOS 그룹 리스트 카드 + 원형 체크박스 +
   시스템 폰트 스타일로 재설계 → **"요일별 색상 쓰지 말고 색은 하나로 통일, 요일 색은 나중에 할 일
   우선순위 표시용으로 남겨두기"** 최종 확정 → 이 스타일을 실제 코드(`globals.css` 색상 토큰,
   `checkbox.tsx`, `todo-column.tsx` 등)에 그대로 적용함. **레이아웃이 바뀌어도 이 시각 스타일은 유지.**
7. **Supabase 연동**: 이메일/비밀번호 로그인, `todos` 테이블 + RLS(본인 데이터만 접근) + Realtime 구독.
   드래그 중에는 로컬 상태만 바뀌고(반응성), **드롭할 때 한 번만 DB에 저장**하도록 최적화.
8. **(2026-09-11 추가) 요일 칸 → 시간 단위 캘린더로 전환**: Google Calendar 주간 뷰 스크린샷을 레퍼런스로,
   Mon~Sun 각 칸을 "할 일 리스트"가 아니라 **0~24시 시간축이 있는 캘린더 그리드**로 교체.
   - 할 일을 Todo List(보관함)에서 특정 요일·시간 칸으로 드래그하면 그 위치의 시간으로 예약됨
     (기본 소요시간 1시간, 15분 단위로 스냅).
   - 예약된 항목은 소요 시간에 비례하는 높이의 블록으로 표시되고, **블록 자체를 드래그해서 다른
     요일/시간으로 옮기거나**, **블록 하단 모서리를 마우스로 드래그해서 소요 시간(높이)을 조절**할 수 있음.
   - 디자인은 여전히 애플 미리알림 톤 유지(색은 primary 파란색 하나만 사용, 요일별/카테고리별 색상은
     아직 안 씀 — 6번 결정 그대로).
   - dnd-kit의 `closestCorners`는 위아래로 아주 긴(24시간짜리) 드롭 영역과는 잘 안 맞아서(모서리 4개
     기준 거리라 세로로 긴 영역이 불리해짐) `pointerWithin`으로 교체함. 이 부분 건드릴 일 있으면 참고.
   - 기존에 요일에만 배정되고 시간이 없던 데이터(레거시)는 렌더링 시 오전 9시/1시간으로 기본값 처리
     (`src/lib/time.ts`의 `DEFAULT_START_MINUTES`/`DEFAULT_DURATION_MINUTES`) — 실제 DB 값은
     사용자가 옮기거나 리사이즈하기 전까진 비어 있음.
   - 같은 시간대에 여러 할 일이 겹치는 경우 나란히 배치하는 처리는 아직 없음(겹치면 그냥 겹쳐 보임,
     드래그로 옮기면 해결). 필요해지면 다음에 추가.
9. **(2026-09-11 추가) 개인용 마감 + 디자인/버그 다듬기**:
   - 개인용으로만 쓸 거라 로그인 페이지의 "가입하기" 전환 버튼을 주석 처리(코드는 남겨둠, 필요하면 주석만 해제).
     완전히 막으려면 Supabase 대시보드 Authentication에서 새 가입 자체를 꺼두는 걸 추천함(아직 안 함).
   - **색상 팔레트를 "Chalk"로 교체**: 쨍한 iOS 시스템 블루(`#007AFF`) 대신 채도를 낮춘 더스티 블루
     (`#5C7599`), 차가운 회색 배경 대신 온기 있는 아이보리(`#F6F4F0`)로. `globals.css` 토큰만 바꾸면
     전체에 반영되는 구조라 컴포넌트는 안 건드림. 다크 모드 토큰도 같이 바꿨지만, 앱에 시스템
     다크모드를 실제로 켜주는 로직이 없어서(이전부터 그랬음) 지금은 라이트만 보임.
   - **모바일 레이아웃을 iOS 캘린더 스타일로**: 오른쪽 고정 아이콘 레일은 모바일에서 하단 바로 이동
     (데스크톱은 그대로). 요일 선택은 필 버튼 대신 요일+날짜 원형 스트립(오늘은 채워진 원, 선택한
     날짜는 링)으로, 그 아래 "37주 · 2026년 9월 11일 금요일" 형태 요약 줄 추가. Todo List 패널은
     모바일에서 화면 절반 정도 올라오는 바텀시트(그랩 핸들 포함)로, 데스크톱은 기존 오른쪽 슬라이드
     패널 유지. 드래그 앤 드롭은 그대로 작동.
   - **버그: 현재 시각 표시줄이 UTC로 계산되던 문제**. Vercel 서버가 UTC로 도는데 `new Date()`를
     렌더링 도중 바로 계산해서 SSR 결과에 UTC 값이 박히던 게 원인(한국시간 밤 11시가 오후 2시로
     보임 — 정확히 9시간 차이). `src/lib/use-today.ts`를 만들어서 "오늘/지금" 관련 계산은 전부
     클라이언트 마운트 이후(`useEffect`)에만 하도록 고침. 앞으로 `new Date()`를 렌더링 중에 바로
     쓰는 코드를 추가하면 같은 문제가 재발할 수 있음 — 항상 이 훅처럼 client-only로 계산할 것.
   - **버그: 데스크톱 아이콘 레일이 오른쪽 위 구석에 작게 쪼그라듦**. `inset-x-0`/`inset-y-0` 같은
     축 단위 유틸리티와 `right-0`/`bottom-auto` 같은 개별 방향 유틸리티를 섞어 써서 같은 속성끼리
     충돌(Tailwind가 생성하는 CSS 순서상 나중 규칙이 이김). top/right/bottom/left를 각각 명시적으로만
     지정하도록 정리. **교훈: 반응형 `fixed` 포지셔닝에서 `inset-*` 축 유틸리티와 개별 side
     유틸리티를 같이 쓰지 말 것** — 항상 side별로만 쓰기.
   - **캘린더 블록 radius 축소 + 인접 블록 사이 틈 추가**: 애플 캘린더 참고 이미지처럼 radius를
     `9~10px`에서 `5px`로 줄이고, 블록 높이에서 `BLOCK_GAP`(2px)을 빼서 시작 위치(top)는 그대로 두고
     붙어있는 일정끼리 살짝 틈이 보이도록 함(`src/lib/time.ts`의 `BLOCK_GAP`).
10. **(2026-09-11 추가) 공유하기 → 애플 단축어 스크랩 기능**: 웹서핑하다 링크를 미리알림에 저장하던
    것처럼, `/api/clip`(`src/app/api/clip/route.ts`)에 POST하면 Todo List 보관함에 새 항목이 생김.
    - 로그인 세션이 아니라 **헤더에 담은 고정 비밀키**(`CLIP_API_SECRET`)로 인증 — 단축어가 Supabase
      로그인 세션을 유지/갱신할 방법이 마땅치 않아서, 그 대신 이 API 전용의 좁은 권한 비밀키를 새로
      만듦. 실제 DB insert는 서버에서만 쓰는 `secret` 키(`SUPABASE_SECRET_KEY`, `src/lib/supabase/admin.ts`)로
      RLS를 우회해서 처리하고, `user_id`는 `CLIP_USER_ID` 환경변수에 고정값(1인용이라 하드코딩).
    - `service_role`(secret) 키를 단축어 자체에 넣는 방식(더 강력하지만 유출 시 DB 전체가 위험)도
      검토했으나, API 라우트를 하나 두고 그 라우트에만 이 좁은 권한 비밀키를 쓰는 쪽으로 결정 — 자세한
      논의는 이 문서 위쪽 대화 참고할 것 없이, 요약하면 "휴대폰에 저장되는 키는 최대한 좁은 권한으로".
    - `todos` 테이블에 `url`, `memo` 컬럼 추가(둘 다 nullable, 별도 필드 — 메모가 URL은 아님).
    - `proxy.ts`가 로그인 세션 없는 요청을 `/login`으로 리다이렉트하던 게 `/api/*`에도 걸려서 API가
      막혔음 — `/api/`로 시작하는 경로는 이 리다이렉트에서 제외하도록 고침(자체 헤더 인증을 쓰므로).
    - 화면 표시: `url`이 있으면 텍스트 아래에 파비콘 + 도메인 임베드 카드(구글 파비콘 서비스 사용,
      실패하면 링크 아이콘으로 대체)가 뜨고 누르면 새 탭으로 열림 (`TodoCard`의 `UrlChip`).
      `memo`는 DB에는 저장되지만 **화면에는 아직 안 보여줌**(요청대로 일단 제외).
    - 예약된 캘린더 블록(`CalendarBlock`)에는 이 임베드 카드를 아직 안 붙임 — 블록이 너무 작아서
      나중에 필요해지면 그때 추가.
    - 단축어 설정 방법은 README.md의 "공유하기 → 애플 단축어로 링크 스크랩" 참고.

## 지금 구현된 것 (기능 목록)

- Todo List(전역 보관함, 사이드 패널) + Mon~Sun **시간 단위 캘린더 그리드** (0~24시, 스크롤 가능)
- 할 일 추가(보관함) / 클릭해서 텍스트 수정 / 삭제 / 완료 체크(원형 체크박스, Reminders 스타일)
- 드래그 앤 드롭: 보관함 ↔ 요일·시간 칸 이동, 예약된 블록을 다른 요일/시간으로 이동,
  보관함 내 순서 변경 ([`@dnd-kit`](https://dndkit.com/), 충돌 감지는 `pointerWithin`)
- 예약된 할 일은 **소요 시간에 비례하는 높이의 블록**으로 표시(시간 범위 라벨 포함),
  **블록 하단 모서리를 드래그해서 소요 시간을 리사이즈** 가능 (15분 단위 스냅)
- 오늘 요일 칸에 현재 시각을 가리키는 빨간 라인 표시 (client-only 계산, `use-today.ts`)
- 주차 이동 (`< 37주 >`, "이번 주" 바로가기, 오늘 날짜에 원형 표시)
- 아이콘 레일(데스크톱은 오른쪽 고정, 모바일은 하단 고정) + 체크 아이콘으로 Todo List 열기
  (데스크톱: 오른쪽 슬라이드 패널 / 모바일: 하단 바텀시트)
- 모바일: iOS 캘린더 느낌의 요일+날짜 원형 스트립으로 하루씩 보기
- 로그인(이메일·비밀번호), 로그아웃 — 가입 버튼은 개인용이라 주석 처리해둠
- Supabase 실시간 동기화 (다른 기기/탭에서 바뀐 내용 자동 반영)
- 공유하기 → 애플 단축어로 링크 스크랩 (`/api/clip`) — Todo List에 제목 + URL 임베드 카드로 추가
- 디자인: "Chalk" 팔레트 (뮤트 더스티 블루 + 아이보리 배경), iOS 그룹 카드 느낌 유지

## 파일 맵

```
PLANNING.md                    기획서 (컨셉/데이터 모델/스택 결정 근거)
README.md                      실행 방법 + Supabase 설정 단계별 가이드
HANDOFF.md                     이 문서

supabase/schema.sql            todos 테이블 + RLS 정책 + realtime publication (Supabase SQL Editor에서 1회 실행,
                                재실행해도 안전)
.env.local.example             필요한 환경변수 템플릿 (진짜 키는 절대 커밋 안 함)

src/app/page.tsx                서버 컴포넌트: 로그인 체크 후 WeekBoard 렌더 (userId/userEmail 전달)
src/app/login/page.tsx          로그인 폼 (가입 전환 버튼은 주석 처리됨)
src/app/api/clip/route.ts       공유하기 스크랩용 API — 비밀키 헤더 인증 → Todo List에 새 항목 insert
src/proxy.ts                    (구 middleware.ts) 인증 안 된 요청을 /login으로 리다이렉트 (/api/*는 제외)

src/lib/supabase/client.ts      브라우저용 Supabase 클라이언트
src/lib/supabase/server.ts      서버 컴포넌트용 Supabase 클라이언트 (로그인 세션 기반)
src/lib/supabase/admin.ts       secret 키로 RLS 우회하는 서버 전용 클라이언트 (/api/clip 전용)
src/lib/supabase/todos.ts       useSupabaseTodos 훅 — fetch + realtime 구독 + 낙관적 업데이트(add/update/remove/reorder)
src/lib/types.ts                Todo 타입, 요일 키, 라벨
src/lib/week.ts                 주차 계산(월요일 시작, ISO 주차, 오늘 여부 등)
src/lib/time.ts                 시간 캘린더 계산(시간→px 변환, 스냅, 시간 라벨 포맷, BLOCK_GAP 등)
src/lib/use-today.ts            "오늘 날짜"를 client-only로 계산하는 훅 (SSR 시간대 버그 방지)
src/lib/utils.ts                cn() 헬퍼 (shadcn 표준)

src/components/week-board.tsx    메인 화면 전체 — 상태 관리, DnD 컨텍스트, 레이아웃 조립
src/components/week-nav.tsx      주차 이동 버튼들
src/components/week-calendar.tsx Mon~Sun 시간 단위 캘린더 그리드(요일 헤더 + 0~24시 스크롤 영역 + 현재 시각 라인)
src/components/calendar-block.tsx 캘린더에 예약된 할 일 블록(드래그로 이동, 하단 핸들로 리사이즈)
src/components/todo-panel.tsx   Todo List 패널 (데스크톱: 오른쪽 슬라이드 / 모바일: 하단 바텀시트)
src/components/icon-rail.tsx    아이콘 레일 (데스크톱 오른쪽 / 모바일 하단, 확장 가능한 구조)
src/components/todo-card.tsx    Todo List 보관함 항목 한 줄(체크박스 + 텍스트 + 드래그 핸들 + 삭제 +
                                 URL이 있으면 파비콘 임베드 카드, 시간 미배정 상태)
src/components/add-todo-form.tsx  할 일 추가 입력 행
src/components/ui/*.tsx         shadcn/ui 기본 컴포넌트 (button/card/checkbox/input)
```

## 아직 안 끝난 것 / 다음 할 일

1. ~~Supabase 프로젝트 실제 연결~~ — **완료 (2026-09-11)**. 실제 프로젝트(`jzrpciwkhwanopqydzqw`, Seoul 리전)에
   `schema.sql` 실행 완료, 가입 → 할 일 추가 → 새로고침 동기화까지 실제로 확인됨.
   API 키는 legacy `anon` 대신 **publishable 키**(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)로 전환해서 사용 중
   (legacy `anon`/`service_role`은 2026년 말 폐지 예정이라 새 키 체계로 바로 세팅함).
2. ~~Vercel 배포~~ — **완료 (2026-09-11)**. 프로덕션: https://plan0.vercel.app
   (Vercel 프로젝트 `wizvees-projects/plan.0`, GitHub 연동도 완료되어 이후 push 시 자동 배포됨)
3. ~~시간 단위 입력/표시~~ — **완료 (2026-09-11)**. 8번 결정 참고. PLANNING.md의 "향후 확장 아이디어" 중
   나머지(카테고리·우선순위 색상 태그, 월간/분기 플래너 탭)는 여전히 범위 밖.
4. 아이콘 레일은 체크 아이콘 하나뿐이라, 나중에 다른 메뉴(설정 등) 추가하기 쉽게 배열 구조로 만들어둠
   (`icon-rail.tsx`의 `items` prop).
5. 같은 요일·시간대에 여러 할 일이 겹치는 경우 나란히 배치(사이드바이사이드 레이아웃)하는 처리는
   아직 없음 — 겹치면 그냥 겹쳐서 보임(사용자가 드래그로 옮기면 해결). 기존에 시간 없이 요일에만
   배정돼 있던 레거시 데이터도 전부 오전 9시 기본값으로 렌더링되면서 서로 겹칠 수 있음.
6. Supabase 프로젝트에 이미 `schema.sql`을 실행해둔 상태라면, 새로 추가된 컬럼(`start_minutes`/
   `duration_minutes`, 그리고 이번에 추가된 `url`/`memo`)을 쓰려면 **`supabase/schema.sql`을
   SQL Editor에서 다시 한 번 실행**해야 함 (전체 스크립트가 재실행해도 안전하도록 작성돼 있음).
7. `/api/clip` 기능을 실제로 쓰려면 `SUPABASE_SECRET_KEY`/`CLIP_API_SECRET`/`CLIP_USER_ID` 세
   환경변수를 로컬(`.env.local`)과 Vercel 양쪽에 아직 등록 안 함 — README의 해당 섹션 참고해서
   설정하고 애플 단축어까지 만들어야 실제로 동작함. 코드/스키마는 준비 완료 상태.
8. 가입 버튼을 코드에서만 주석 처리했음 — 완전히 막으려면 Supabase 대시보드
   Authentication → Sign In / Providers → Email에서 "Allow new users to sign up"을 꺼야 함(아직 안 함).

## `.env` / 키 노출 관련 (사용자 질문에 대한 답)

- `.gitignore`에 `.env*`를 이미 막아놨고, 템플릿용 `.env.local.example`만 예외로 커밋되어 있습니다
  (`!.env*.example` 룰). 지금까지 실제 키가 담긴 `.env.local`을 커밋한 적은 없습니다 — 안심하고 로컬에서
  `cp .env.local.example .env.local` 한 뒤 값을 채우면 되고, 이 파일은 git이 무시합니다.
- 다만 로컬 작업 중에도 실수로 `git add -A` 등으로 강제로 끌려오지 않는지 커밋 전에 `git status`로
  한 번 확인하는 습관은 필요합니다.
- 참고로 Supabase의 `publishable` 키(옛 `anon` 키)는 원래 브라우저에 그대로 노출되는 게 정상인 키입니다
  (RLS로 보호). 민감한 건 **`secret` 키(옛 `service_role` 키)**인데, 이 프로젝트는 어디서도 그 키를 쓰지
  않습니다. 그래도 습관적으로 `.env`류는 커밋하지 않는 게 맞습니다.
  (`anon`/`service_role`은 legacy 키로 전환되어 2026년 말 폐지 예정 — 새 프로젝트는 기본적으로
  publishable/secret 키 체계를 씁니다.)

## 새 세션에서 이어갈 때

1. 이 문서 + PLANNING.md + README.md를 먼저 읽기.
2. `git log --oneline`으로 커밋 히스토리 훑어보면 각 변경의 이유가 커밋 메시지에 꽤 자세히 적혀 있음.
3. Supabase 설정부터 진행(README 참고)한 뒤, `npm run dev`로 실제 로그인부터 테스트.
4. 이후 요청은 위 "아직 안 끝난 것" 목록 중 하나부터 진행하면 자연스럽게 이어집니다.

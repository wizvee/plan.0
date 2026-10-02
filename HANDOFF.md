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
- **프로덕션 브랜치: `main`** (2026-09-27부터. GitHub 기본 브랜치이자 Vercel Production Branch —
  이전에는 `claude/weekly-todo-webapp-plan-hx1le7`라는 긴 이름이었는데, 사용자 요청으로 GitHub
  기본 브랜치 설정 + Vercel Production Branch 설정을 둘 다 `main`으로 바꿈. 옛 브랜치는 당분간
  그대로 남겨둠 — 필요 없어지면 사용자가 정리하기로 함.)
- **(2026-10-01) 브랜치 정리**: `main`에 머지된 브랜치를 지우려 했지만 Claude 세션의 git 프록시가 자기 작업 브랜치 말고는 지우기를 막는다(HTTP 403).
  사용자가 GitHub 웹(Branches)에서 지운다. 그 시점에 머지된 브랜치 14개: `claude/eager-allen-e8yh5u` · `claude/ecstatic-euler-m5k1z0` ·
  `claude/gracious-galileo-tmes1w` · `claude/inbox-para-groups` · `claude/memo-marks` · `claude/memo-tab-badge` · `claude/optimistic-noether-311on4` ·
  `claude/para-open-marks` · `claude/project-docs-review-0ectiz` · `claude/retro-to-memo` · `claude/search` · `claude/tender-allen-0vra8b` ·
  `claude/weekly-calendar-default-day-p9dqya` · `claude/weekly-todo-webapp-plan-hx1le7`(옛 프로덕션 브랜치).
  머지 안 된 6개(`brave-ptolemy` · `festive-mendel` · `happy-dirac` · `keen-clarke` · `new-ui-design` · `weekly-planner-header-change`)는 남겨 둠 — 지울지는 사용자가 판단.
- 로컬로 가져오기:
  ```bash
  git clone https://github.com/wizvee/plan.0.git
  cd plan.0
  git checkout main
  npm install
  ```

## 문서 구조 (2026-10-02 정리)

- **루트** — 늘 보는 문서만: README(설정 · 실행) · PLANNING(기획서) · HANDOFF(이 문서) · FEATURES(기능 목록) · DESIGN(디자인 규칙) · CLAUDE / AGENTS.
- **`docs/plans/`** — 진행 중인 기능 계획(지금: WEBAPP-PLAN — 푸시 발송 6~8단계가 남음, 미머지 브랜치 `claude/new-ui-design-p4e912`).
- **`docs/plans/done/`** — 구현이 끝난 계획(결정 이력 · 시안 링크 참고용). REFLECTIONS-PLAN은 메모 회고로 대체된 것.
- 새 기능 계획은 `docs/plans/<이름>-PLAN.md`로 만들고, 구현이 끝나면 `done/`으로 옮긴다. 다른 문서 · 코드 주석은 파일 이름(`GOALS-PLAN.md`)으로
  가리키니 찾을 땐 이름으로 검색. SQL도 같은 규칙 — 실행한 마이그레이션은 `supabase/migrations/applied/`.

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
11. **(2026-09-12 추가) PARA(Project/Area/Resource) 구현**: 기획서(PLANNING.md 8번) 확정 후 목업으로
    사용자 컨펌 받고 코드로 옮김. 자세한 개념/설계는 PLANNING.md 8번 참고, 여기는 구현 메모만.
    - **데이터 모델**: `projects`(status/start_date/due_date/completed_at), `areas`,
      `resources`(둘 다 archived) 세 테이블을 계층 없이 독립적으로 추가 (자유 텍스트 `notes` 컬럼은
      13번 결정으로 완전히 대체돼서 제거됨). `todos`에
      `project_id`/`area_id`/`resource_id` nullable FK 3개 추가하고
      `CHECK (num_nonnulls(project_id, area_id, resource_id) <= 1)` 제약으로 "최대 1곳에만 매핑"을
      DB 레벨에서 강제(`supabase/schema.sql`). **기존 Supabase 프로젝트에 이미 schema.sql을 실행해둔
      상태라면 이 부분을 쓰려면 다시 한 번 실행해야 함.**
    - **화면**: `/para` — 왼쪽 아이콘 레일(Project/Area/Resource, `para-board.tsx`)로 종류를 고르고
      중앙에 그 종류의 카드 목록. 오른쪽 "할 일 보관함"은 기존 `IconRail`/`TodoPanel`을 그대로 재사용
      (새로 안 만듦 — 사용자 지시). 보관함 항목을 카드로 드래그하면 매핑(`project:`/`area:`/`resource:`
      접두사가 붙은 droppable id로 종류 구분), 다시 보관함으로 드래그하면 매핑 해제. 메인 캘린더 화면
      아이콘 레일에도 `/para`로 가는 아이콘 추가.
    - **상세 화면**: `/para/[kind]/[id]` (`container-detail-screen.tsx`) — 헤더+아이콘, 요약 줄
      (Status·Due date·Progress는 Project만), Overview/Tasks/Notes 탭. Tasks 탭은 기존 `TodoCard`를
      그대로 재사용. (Notes 탭은 처음엔 자유 텍스트 메모 하나였는데 13번 결정으로 여러 개의 노트
      리스트로 완전히 바뀜.)
    - **배지**: 이미 매핑된 할 일은 `TodoCard`에 소속 Project/Area/Resource 이름이 작은 배지로 보임
      (`TodoCard`의 `badge` prop, `TodoPanel`의 `getBadge` prop으로 연결). 메인 캘린더 화면의
      `TodoPanel`은 이 prop을 안 넘기므로 기존 화면엔 아무 변화 없음.
    - **아직 이번 범위에 없는 것**: Project/Area/Resource 이름 수정 UI(생성만 가능, 이름 변경은 아직
      화면에 없음 — 필요해지면 todo-detail-modal처럼 클릭해서 수정하는 방식 추가), 완료된
      Project/보관된 Area·Resource를 목록에서 접거나 필터링하는 기능(지금은 계속 같이 보임), 이미
      요일/시간에 배정된 할 일(캘린더에 이미 올라간 것)은 Todo List 보관함에 안 보여서 이 화면에서
      드래그로 매핑할 수 없음(보관함=`day`가 없는 항목만 보여주는 기존 구조를 그대로 재사용했기 때문 —
      "오른쪽은 기존 투두리스트 유지" 지시에 따른 결과, 필요해지면 다음에 논의).
    - **테스트**: `tsc --noEmit`, `eslint`, `next build` 모두 통과 확인. 이 세션 환경에는 실제 Supabase
      키가 없어서(`.env.local` 없음) 로그인부터 막혀 브라우저로 실제 동작(드래그 앤 드롭, 로그인 등)은
      확인 못 함 — 로컬에서 Supabase 연결 후 실제로 한 번 테스트 필요.
12. **(2026-09-12 추가) PARA 배포 후 다듬기 — 아이콘 레일 통합 + 드래그 버그 수정**:
    - **공유 아이콘 레일**: 캘린더 화면과 PARA 화면(목록·상세)이 각자 다른 아이콘 레일을 가지고 있던 걸
      `AppNavRail`(`src/components/app-nav-rail.tsx`) 하나로 통합 — Todo List 토글 + PARA + 캘린더 이동
      3개 아이콘을 모든 화면에서 동일하게 보여줌. PARA 화면 상단의 "← 캘린더로" 텍스트 링크는 이
      아이콘으로 대체돼서 제거됨. PARA 아이콘은 이미 PARA 화면에 있어도 계속 보임(활성 표시만 됨) —
      사용자가 "PARA 메뉴도 파라 화면에서 빼지 말고 계속 있었으면 좋겠어"라고 명시적으로 요청함.
    - **버그: PARA 화면에서 할 일을 드래그해도 매핑이 안 됨**. 원인은 "할 일 보관함" 패널 자체가
      BACKLOG라는 별도의 드롭 영역을 갖고 있는데, 화면에서 실제 매핑 대상(리소스/프로젝트 카드,
      상세 화면 전체 등)과 겹치면 dnd-kit의 `pointerWithin`이 둘 중 아무거나 집을 수 있어서, 이미
      보관함에 있는 항목을 다시 보관함에 놓은 것처럼 처리돼 아무 일도 안 일어난 것처럼 보였음.
      `src/lib/dnd.ts`의 `preferSpecificTargetCollision`으로 — 겹칠 때 BACKLOG가 아닌 쪽을 우선하도록
      고침. 캘린더/PARA 목록/PARA 상세 세 화면의 `DndContext` 모두 이걸 씀. **비슷한 겹침이 생기는
      새 드롭 영역을 추가할 때는 항상 이 collision detection을 재사용할 것.**
13. **(2026-09-14 추가) 할 일(Task) / 노트(Note) 구분 추가**:
    - **컨셉**: Todo List(Inbox)에 있는 항목은 이제 두 종류 — 체크박스가 있는 **할 일(task)**과, 체크박스
      없이 텍스트만 있는 **노트(note)**. 같은 `todos` 테이블에 `kind`('task'\|'note') 컬럼만 추가해서
      구분(전환 기능을 고려한 선택 — "할 일→노트 전환"은 이 필드 하나만 바꾸면 됨). PARA 매핑 구조
      (`project_id`/`area_id`/`resource_id`)는 task/note 공통으로 그대로 재사용.
    - **가시성 규칙**: 노트는 **어디에도 매핑 안 됐을 때만** Inbox(Todo List)에 보이고, Project/Area/
      Resource 중 하나로 매핑되는 순간 Inbox에서 사라지고 그 컨테이너의 Notes 탭에서만 보임(그
      컨테이너로 "이동"한 것처럼 취급). 반대로 할 일(task)은 기존과 동일하게 매핑 여부와 무관하게
      계속 Inbox에 보임(배지만 붙음) — `src/lib/types.ts`의 `isInboxVisible()` 참고.
    - **Notes 탭 전면 개편**: 컨테이너당 자유 텍스트 메모 하나였던 걸 완전히 대체해서, 이제 `kind='note'`
      이면서 그 컨테이너에 매핑된 항목들의 리스트로 바뀜(Tasks 탭과 같은 스타일, 체크박스만 없음).
      `projects`/`areas`/`resources`의 `notes` 컬럼은 더 이상 안 쓰여서 스키마에서 제거함
      (`supabase/schema.sql`에 `drop column if exists notes` 추가 — 다시 실행 필요).
    - **노트 추가 위치**: Inbox의 "할 일 추가" 입력창에 할일/노트 전환 토글을 추가해서 Inbox에서도
      바로 노트를 만들 수 있음(`add-todo-form.tsx`). 컨테이너 상세화면 Notes 탭에도 별도 "새 노트 추가"
      입력창이 있어서, 여기서 만들면 처음부터 그 컨테이너에 매핑된 상태로 생성됨(`addNote`에 매핑 전달).
    - **전환**: 할 일 카드를 클릭하면 뜨는 상세 팝업(`TodoDetailModal`)에 "노트로 전환"/"할 일로 전환"
      버튼 추가. 할 일→노트 전환 시 요일/시간 배정과 완료 상태를 전부 초기화함(노트는 캘린더 배정이나
      완료라는 개념이 없어서).
14. **(2026-09-17 추가) UI/UX 리디자인 — 미니멀 캘린더형**: 사용자가 기존 Apple 미리알림 스타일이
    마음에 안 든다고 해서, Claude Design 캔버스에 Notion Calendar/Google Calendar 참고 목업(로그인/
    캘린더/PARA 보드/PARA 상세/모바일 2종)을 그려서 몇 차례 피드백(팔레트는 기존 유지, radius 더
    각지게, 로그인 더 가볍게) 받은 뒤 코드에 반영. 오른쪽 아이콘 레일 → **왼쪽 사이드바**(데스크톱,
    `app-sidebar.tsx`가 `todo-panel.tsx`를 대체)로 내비게이션 이동, PARA 매핑에 따른 **카테고리 색상
    코딩**(`lib/category.ts`) 추가, PARA 보드 세로 아이콘 스위처 → 가로 세그먼트 컨트롤 + 카드 그리드,
    로그인 화면 박스형 카드 → 중앙 정렬 밑줄 인풋. 자세한 토큰 값/레이아웃 규칙/새 화면 만들 때
    체크리스트는 [DESIGN.md](./DESIGN.md) 참고 — **이후 화면 작업은 전부 이 문서를 따를 것.**
    머지: `claude/brave-ptolemy-pz7uye` → `claude/weekly-todo-webapp-plan-hx1le7`(커밋 `a7072f5`).
15. **(2026-09-17 추가) `todos.day` + `week_start` → `scheduled_date` 하나로 통합**: 사용자가 프로젝트
    Tasks 탭에 날짜가 안 보이는 버그를 Supabase에서 직접 로우를 열어보다가, `day`(요일 텍스트) +
    `week_start`(그 주 월요일)로 "날짜"를 쪼개 저장하는 구조 자체가 월간 뷰나 임의 날짜(마감일 등)
    확장에는 안 맞는다고 지적함 — 맞는 지적이라 스키마를 실제 `date` 컬럼 하나로 바꿈.
    - `supabase/schema.sql`: `scheduled_date date` 컬럼 추가 → 기존 `day`+`week_start` 값으로부터
      계산해서 채우는 `update` (day→요일 오프셋 매핑) → `day`/`week_start` 컬럼 drop. 전부
      `information_schema.columns` 존재 체크로 감싸서 다시 실행해도 안전함(재실행 컨벤션 유지).
      **다시 실행 필요.**
    - `Todo` 타입(`src/lib/types.ts`)에서 `day`/`weekStart` 제거하고 `scheduledDate: string | null`
      하나로. `isInboxVisible()`도 이 필드 기준으로 판정.
    - 캘린더 쪽 요일 그룹핑은 `scheduledDate`가 그 주 범위(월~일) 안에 있는지로 필터링하고,
      `lib/week.ts`의 새 헬퍼 `dayKeyOf(date)`로 실제 요일을 역산해서 칸에 배치(`week-board.tsx`).
      그리드에 드롭할 때도 `dayDateKey(monday, dayIndex)`로 실제 날짜를 계산해서 저장.
    - `todo-card.tsx`의 날짜 표시(진행 중이던 기능 — 완료 전인데 날짜가 지나면 빨간색)도 이제
      `todo.scheduledDate`를 바로 읽으면 됨. 이 리팩터로 표시 버그도 같이 해결됐어야 함 — 배포 후
      실제로 뜨는지 재확인 필요.
16. **(2026-09-17 추가) 캘린더 월별 뷰 추가**: Claude Design 캔버스에 목업(사이드바 미니 캘린더의
    월 라벨 클릭 → 월별 뷰, 날짜 칸 클릭 → 그 주 주별 뷰, "캘린더" 메뉴는 항상 이번 주로) 그려서
    컨펌받은 뒤 코드로 반영.
    - `week-board.tsx`에 `viewMode: "week" | "month"` 상태 추가. URL은 `?week=<월요일>`(주별) 또는
      `?view=month&month=<그 달 1일>`(월별)로 항상 동기화 — 15번 결정 이전에 이미 있던 "주소창
      `?week=`가 안 바뀌던 버그"와 같은 패턴이라 같은 방식(값이 바뀔 때마다 `router.replace`)으로 처리.
    - 새 컴포넌트 `month-calendar.tsx` — 7×5~6 그리드, 칸마다 날짜 숫자 + `scheduledDate`가 그 날인
      할 일 최대 2개(카테고리 색상 코딩 재사용, `lib/category.ts`) + 넘치면 "+N개 더보기". 칸 클릭하면
      그 날짜가 속한 주의 주별 뷰로 전환.
    - `mini-calendar.tsx`에 `onSelectMonth?` prop 추가 — 있으면 상단 "9월 2026" 라벨이 클릭 가능해져서
      지금 미니 캘린더가 보여주는 달로 월별 뷰를 엶(미니 캘린더 자체의 prev/next 달 이동과는 별개).
    - **"캘린더" 메뉴는 항상 이번 주 주별 뷰**로 가야 하는데, 이미 캘린더 화면(월별 뷰 포함)에 있는
      상태에서 누르면 같은 라우트라 리마운트가 안 돼서 URL만 바꾸는 방식으론 상태가 안 바뀜. 그래서
      `AppSidebar`/`AppNavRail`에 `onCalendarClick?` prop을 추가해서, 있으면(캘린더 화면 자신만 넘겨줌)
      라우팅 대신 `viewMode`/`monday` state를 직접 리셋하고, 없으면(PARA 등 다른 화면) 기존처럼
      `router.push("/")`로 이동(그 경우는 새로 마운트되니 기본값=주별 뷰로 자연스럽게 열림).
17. **(2026-09-18 추가) 할 일 상세 팝업에서 PARA/URL 직접 수정 가능하게**: 상세 팝업(`todo-detail-modal.tsx`)에서
    지금까지 Project/Area/Resource 매핑과 URL을 수정할 방법이 없었던 문제. Notion/TickTick/미리알림을
    참고해 Claude Design 캔버스로 목업을 그려 컨펌받은 뒤 반영.
    - 제목 아래에 **PARA 속성 행** 추가 — 카테고리 아이콘(Target/Compass/Bookmark, 매핑 없으면 Layers)
      + 매핑된 이름을 누르면 팝오버가 열리고, 검색 + "없음"(해제) + 프로젝트/영역/리소스별 그룹 목록에서
      고를 수 있음. 바깥을 클릭하면 닫히도록 `pointerdown` 리스너로 처리.
    - **URL 첨부**를 클릭하면 새 탭으로 이동만 되던 `UrlChip`(읽기 전용) 대신, 인풋으로 바로 타이핑해서
      고칠 수 있게 바꾸고 옆에 새 탭 열기(↗) 버튼만 따로 뒀음 — 스크랩 항목 아니어도 항상 노출.
    - 하단 액션도 세로로 쌓아뒀던 "노트로 전환"/삭제 버튼을 구분선 아래 한 줄(좌: 전환, 우: 삭제 아이콘)로 정리.
    - `TodoDetailModal`이 이제 `projects`/`areas`/`resources`/`onAssignPara`/`onUrlEdit`을 받아야 해서,
      이 모달을 렌더링하는 `todo-card.tsx`/`calendar-block.tsx`/`month-calendar.tsx`부터 그 위의
      `week-calendar.tsx`/`app-sidebar.tsx`/`week-board.tsx`/`para-board.tsx`/`container-detail-screen.tsx`까지
      전부 prop을 새로 뚫어야 했음 — 특히 `week-board.tsx`는 이때 처음으로 `useSupabaseProjects/Areas/Resources`를
      불러오기 시작함(그전엔 캘린더 화면에 컨테이너 목록이 없었음).
18. **(2026-09-23 추가) "진짜 뒤로가기" + 사이드바 화면별 하드코딩 제거**: 사용자가 실사용하면서 두 가지를
    지적함 — (1) PARA에서 탭(Project/Area/Resource)을 바꾸거나 상세 화면에 들어갔다가 뒤로가기를 누르면
    항상 Project 탭으로 리셋됨(탭 상태가 URL에 없어서 새로 마운트되면 기본값으로 돌아감), (2) 캘린더
    화면에서만 되던 미니 캘린더의 "월 라벨 클릭 → 월별 뷰" 기능이 PARA 화면에서는 안 됨 —
    `AppSidebar`가 화면마다 `monday`/`onSelectWeek`/`onSelectMonth`/`onCalendarClick` prop을 일일이
    받아야 동작하는 구조였고, PARA 쪽 화면들은 그 prop을 안 넘겼으니 기능이 통째로 빠져 있었음.
    - **PARA 탭/서브탭도 URL을 유일한 출처로**: `para-board.tsx`의 Project/Area/Resource 탭은
      `?kind=`, `container-detail-screen.tsx`의 Overview/Tasks/Notes 탭은 `?tab=` 쿼리로 옮기고
      (별도 state 없이 `searchParams`에서 직접 계산, 바뀔 때 `router.replace`), 상세 화면의 뒤로가기
      화살표도 `router.push("/para")`(kind 정보 없이 하드코딩)에서 `router.push(`/para?kind=${kind}`)`로
      고쳐서 어느 경로로 돌아가든 원래 보던 탭이 그대로 복원되게 함.
    - **`AppSidebar`/`AppNavRail`을 화면 비의존적으로 리팩토링**: 두 컴포넌트가 `usePathname()`/
      `useSearchParams()`로 "지금 캘린더 화면(`/`)에서 주별 뷰를 보고 있는지"를 스스로 판단해서 미니
      캘린더 강조·날짜/월 클릭 내비게이션을 전부 자체 처리하도록 바꿈(캘린더 화면이면
      `router.replace`, 다른 화면에서 왔으면 `router.push`). 그 결과 `monday`/`onSelectWeek`/
      `onSelectMonth`/`onCalendarClick` prop 4개가 통째로 없어졌고, 어느 화면에 놓든(캘린더/PARA/PARA
      상세) 완전히 동일하게 동작함 — 새 화면을 추가할 때도 이 prop들을 신경 쓸 필요가 없어짐.
    - 이걸 가능하게 하려고 `week-board.tsx`도 `monday`/`viewMode`/`displayMonth`를 더 이상 `useState`로
      들고 있지 않고, 매 렌더마다 `useSearchParams()`에서 직접 계산하도록 바꿈(변경 지점마다
      `router.replace`/`router.push`로 URL을 직접 바꿈). 그래야 `AppSidebar`가 URL만 바꿔도(같은
      라우트라 리마운트가 안 되는 경우에도) 캘린더 화면이 바로 반응함 — 16번 결정에서 남겨뒀던
      "같은 라우트 재방문 시 리마운트가 안 된다" 문제를, `onCalendarClick` 같은 화면별 콜백으로
      우회하는 대신 아예 상태의 출처를 URL 하나로 통일해서 근본적으로 없앤 것.
    - `src/lib/week.ts`에 `parseDateKey(key)` 헬퍼 추가 — `yyyy-MM-dd` 쿼리값을 Date로 파싱하는
      코드가 여러 파일에 중복돼 있던 것을 하나로 모음.

17. **(2026-09-18 추가) 노트/자료를 Google Drive 파일로 관리하는 기능 — 백엔드만 우선 구현**:
    PLANNING.md 9번 기획에 따라, 회사(Windows) 환경에서도 plan.0 화면 안에서만 노트(마크다운)와
    첨부 자료(PPT/PDF 등)를 다루되 DB가 아니라 본인 Google Drive에 파일로 저장하도록 진행.
    - 서버 쪽만 우선 구현: `drive_folder_id` 컬럼(3개 테이블) + `src/lib/google-drive.ts` +
      `/api/drive/{folder,files,notes}` 세 라우트. **Notes 탭 UI는 아직 안 건드림** — HANDOFF.md
      상단 "작업 방식" 규칙(UI는 목업 컨펌 전엔 코드로 안 만듦)에 따라 캔버스 시안 컨펌 이후로 미룸.
    - 애초 안(9.6)은 사용자가 드라이브에 미리 만들어둔 최상위 폴더 ID를 환경변수로 넘기는 방식이었는데,
      구현하면서 스코프 문제를 발견해서 바꿈: 사용자가 직접 만든 폴더는 `drive.file`(앱이 만든 파일에만
      접근하는 좁은 스코프)로는 못 보고, 더 민감한 `drive` 전체 스코프가 필요해짐. 대신 **최상위 "PARA"
      폴더도 앱이 최초 API 호출 시 자동 생성**하도록 바꿔서 전체 트리가 앱 소유가 되게 하고, 좁은
      스코프만으로 충분하게 만듦. 그래서 `GOOGLE_DRIVE_ROOT_FOLDER_ID` 환경변수는 필요 없어짐.
    - Google Cloud OAuth 클라이언트 등록 + refresh token 발급은 본인 Google 계정으로 직접 진행해야
      하는 부분이라(에이전트가 대신 못 함) 아직 미완료 — README.md "Google Drive 연동 설정" 섹션에
      단계별로 정리해둠(OAuth Playground로 refresh token 받는 방법 포함). 이게 끝나야 방금 만든
      API들을 실제로 테스트해볼 수 있음.

18. **(2026-09-18 추가) Google 인증 구조를 "환경변수 refresh token 1개" → "앱 안 OAuth 연결
    플로우"로 재설계**: 17번에서 만든 방식(에이전트가 OAuth Playground로 refresh token을 받아서
    환경변수에 넣으라고 안내)에 사용자가 강하게 반대함 — "테스트" 상태라 7일마다 만료되는데 그때마다
    수동으로 재발급받으라는 건 실사용 앱에 맞지 않고, "사용자는 영원히 1명"이라는 전제도 잘못됐을 수
    있다는 지적(나중에 여러 사용자에게 열 수도 있음). 사용자 판단: "Google 로그인하면 당연히 앱이
    refresh token을 받아오는 구조"가 맞다 — 그래서 그렇게 재설계함.
    - `google_accounts` 테이블 추가(`user_id` PK, `refresh_token`, RLS로 본인 것만). `.env`에는
      이제 앱 전체가 공유하는 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`만 남고
      `GOOGLE_REFRESH_TOKEN`은 없어짐.
    - `GET /api/auth/google`(로그인 사용자를 Google 동의 화면으로) / `GET /api/auth/google/callback`
      (코드를 토큰으로 교환해서 `google_accounts`에 저장) 두 라우트 추가.
    - `src/lib/google-drive.ts`의 모든 함수가 `refreshToken`을 첫 인자로 받도록 변경(전역
      env 참조 제거). `src/lib/google-account.ts`에 조회/저장 헬퍼 + API route 공용 가드
      `requireGoogleAuth()` 추가, `/api/drive/{folder,files,notes}`가 이걸로 갱신됨.
    - 사이드바 계정 영역에 "Google Drive 연결" 링크 추가.
    - README의 Google Drive 연동 설정 섹션도 이 구조에 맞게 다시 씀 — OAuth Playground 절차 없어짐,
      리디렉션 URI를 앱 자신의 콜백 주소(`/api/auth/google/callback`)로 등록하는 것으로 바뀜.
    - 동의 화면을 "프로덕션"으로 게시할지는 여전히 사용자 선택 사항으로 남겨둠(문서가 강요하지 않음).
    - 실사용 중 `redirect_uri_mismatch` 에러 발생 → Google Cloud 콘솔에 등록한 리디렉션 URI가
      실제 배포 도메인과 정확히 안 맞았던 것(흔한 원인: 슬래시, http/https, 오타) — 해결됨.

19. **(2026-09-18 추가) Google Drive 연결 상태를 사이드바에 표시 + 만료 토큰 자동 정리**: 18번
    구현 직후 사용자가 "연결해도 계속 '연결' 링크만 뜬다"고 지적 + "7일마다 계속 눌러줘야 하는
    거냐"고 질문 — 두 가지 다 처리함.
    - 각 page.tsx(`/`, `/para`, `/para/[kind]/[id]`)가 `isGoogleConnected()`로 `google_accounts`에
      row가 있는지 확인해서 `googleConnected` prop을 WeekBoard/ParaBoard/ContainerDetailScreen →
      AppSidebar까지 내려줌. 연결 안 됐으면 "Google Drive 연결", 연결됐으면 "Google Drive 연결됨
      · 재연결"로 사이드바 표시가 바뀜.
    - **"테스트" 상태를 유지하는 한 7일 주기 재연결 자체는 없앨 수 없음**(Google 정책, 코드로 우회
      불가) — 다만 `/api/drive/*`가 Google의 `invalid_grant` 에러(토큰 만료)를 감지하면
      `google_accounts`에서 그 토큰을 자동으로 지우도록 만들어서(`isInvalidGrantError`/
      `handleGoogleApiError`, `src/lib/google-account.ts`), 만료되면 사이드바가 자동으로 "연결 안
      됨" 상태로 돌아가고 클릭 한 번으로 재연결하면 됨 — 사용자가 만료 여부를 직접 신경 쓸 필요는
      없어짐.

20. **(2026-09-18 추가) 노트/자료 캔버스 시안(9.5) 코드 반영 — Tasks 탭 스크랩 승격 + 자료 탭**:
    19번까지 완료된 OAuth/API 백엔드 위에, 확정된 캔버스 시안(PLANNING.md 9.5,
    https://claude.ai/artifact/KMMXdKodS4dpEbt7iehxpq)을 그대로 코드로 옮김.
    - **용어/탭 정리**: 컨테이너 상세 화면(`container-detail-screen.tsx`) 3번째 탭이
      ~~Notes~~ → **"자료"**로 바뀌고, `todos.kind='note'` 항목(스크랩)은 이제 Notes 탭이 아니라
      **Tasks 탭 안 "스크랩" 섹션**(`scrap-section.tsx`)으로 옮김 — 인박스 가시성 규칙(13번 결정,
      `isInboxVisible`)이나 할일↔스크랩 전환 로직은 전혀 안 바뀜, UI 위치와 이름만 바뀜.
    - **스크랩 → 노트 승격**: "노트로 만들기"를 누르면 스크랩 섹션이 체크박스 선택 모드로
      바뀌고(`scrap-section.tsx`), 하나 이상 고른 뒤 "노트 만들기"를 누르면
      `POST /api/drive/promote`(새 라우트)가 (a) 컨테이너 Drive 폴더가 없으면 그 자리에서
      생성하고, (b) 선택된 스크랩들의 제목/URL/메모를 엮은 마크다운 + frontmatter를 새 노트
      파일로 만들고, (c) 원본 스크랩 로우를 삭제까지 한 번에 처리한다(사용자 확정: 승격 후 원본은
      안 남김). 응답으로 파일/속성/본문을 그대로 받아서 자료 탭 에디터를 승격 직후 상태로 바로 염
      + "원본 스크랩은 정리됐다" 배너 표시.
    - **자료 탭**(`files-tab.tsx`): Drive 폴더의 파일 목록(`GET /api/drive/files`, 아이콘은
      `lib/drive-file.ts`의 `classifyDriveFile`로 md/pdf/pptx/image 구분) + 업로드(클릭 또는
      드래그앤드롭, `POST /api/drive/files`) + 새 노트 버튼. 마크다운 파일을 클릭하면
      `GET /api/drive/notes?fileId=`로 읽어서 인앱 에디터로 전환, 비-마크다운 파일은
      `webViewLink`를 새 탭으로 엶(별도 미리보기 컴포넌트 안 만듦, 시안 그대로).
    - **인앱 마크다운 에디터**: 제목 인풋 + "속성"(Properties) 블록 + 본문 textarea. 저장 시
      `PUT /api/drive/notes`(fileId + content, 제목이 바뀌었으면 `title`도 같이 보내서 파일명까지
      리네임 — `google-drive.ts`에 `renameFile` 추가)를 호출하고, 새 노트면 먼저
      `POST /api/drive/notes`로 파일을 만든 뒤 곧바로 `PUT`으로 실제 내용을 덮어씀.
    - **Properties(속성) 구현**: `src/lib/frontmatter.ts`에 YAML frontmatter 파서/직렬화기를
      **별도 라이브러리 없이 손으로** 최소 구현(9.5에서 "코드 작업 시작할 때 결정"하기로 했던
      부분) — 모든 속성 값은 항상 리스트로 쓰고(`key:\n  - value`), 읽을 때 값이 전부
      `http(s)://`로 시작하면 링크형(클릭 가능한 밑줄 텍스트), 아니면 태그형(작은 사각 칩,
      `rounded-sm`)으로 추론해서 렌더링. "속성 추가"는 태그형 속성 하나만 추가 가능(시안 그대로,
      중복 방지 가드 포함), 태그 칩은 이 구현에서 값 추가/삭제까지 되게 살짝 보강함(시안은 정적
      프로토타입이라 "+"/칩에 실제 동작이 안 걸려 있었음).
    - **Drive 폴더 lazy 생성 확정** (9.8 열린 질문 4번): 컨테이너 생성 시점이 아니라, **자료 탭을
      처음 열 때(또는 스크랩을 처음 승격할 때)** `drive_folder_id`가 없으면 그 자리에서
      `POST /api/drive/folder`를 호출해서 만듦 — 기존에 이미 만들어져 있던 프로젝트/영역/리소스도
      별도 마이그레이션 없이 자연스럽게 커버됨.
    - 새 파일: `src/lib/frontmatter.ts`, `src/lib/drive-file.ts`,
      `src/app/api/drive/promote/route.ts`, `src/components/para/scrap-section.tsx`,
      `src/components/para/files-tab.tsx`. `container-detail-screen.tsx`가 이 모든 상태(파일
      목록/에디터/스크랩 선택)를 갖고 있고 두 프레젠테이션 컴포넌트에 내려주는 구조 —
      다른 화면(캘린더/PARA 목록)에서 하던 것과 같은 패턴.
    - `tsc --noEmit`, `eslint`, `next build` 모두 통과 확인. 브라우저로 실제 Drive 연동까지
      테스트는 아직 안 함(로컬에서 실제 계정으로 연결 후 확인 필요).

21. **(2026-09-18 추가) Google Drive 연결 실패가 화면에 아무 흔적도 안 남던 버그 수정**: 사용자가
    사이드바에서 "Google Drive 연결"을 누르고 정상적으로 돌아왔다고 생각했는데, 자료 탭에서 계속
    "Google Drive 계정을 먼저 연결해주세요."가 뜬 문제. 원인: `/api/auth/google/callback`이 성공/
    실패 여부를 `?google=connected|error|no_refresh_token` 쿼리로 돌려주고는 있었는데, 그걸
    화면 어디에서도 읽어서 보여주지 않았음 — 특히 Google이 refresh token을 안 내려주는 경우
    (`no_refresh_token`, 이미 동의한 계정인데도 이런저런 이유로 발생 가능)엔 `google_accounts`에
    아무것도 저장되지 않은 채 조용히 "성공한 것처럼" 원래 화면(`/para`)으로 돌아가서, 사용자
    입장에선 연결이 실패한 걸 알 방법이 전혀 없었음.
    - `para-board.tsx`(사이드바의 "Google Drive 연결" 링크가 `next` 파라미터 없이 항상 `/api/auth/google`을
      가리켜서, 콜백은 기본값인 `/para`로 돌아옴 — 그래서 이 화면에 배너를 둠)에 `?google=` 값을
      마운트 시점에 한 번 읽어 배너로 보여주고, `router.replace`로 주소에서 지움.
    - 배너 문구: `connected` → "Google Drive가 연결됐습니다.", `no_refresh_token` → "Google에서
      접근 권한(refresh token)을 받지 못했습니다. 사이드바에서 다시 연결해주세요.", `error` →
      "Google Drive 연결에 실패했습니다. 사이드바에서 다시 시도해주세요."
    - 사용자가 겪은 실제 원인이 `no_refresh_token`이었는지 `error`였는지는 이 배너가 붙은 다음
      재연결을 시도해봐야 확인 가능 — 코드 자체(콜백 로직, RLS 정책)에서는 버그를 못 찾음.

22. **(2026-09-18 추가) 진짜 원인 발견: `google_accounts` 테이블이 실제 Supabase 프로젝트에
    없었음 + 그걸 숨긴 코드 버그**: 21번 배너를 붙이고 재연결했더니 "Google Drive가 연결됐습니다"
    배너가 떴는데도 여전히 연결 안 됨 에러가 났고, 사용자가 Supabase 대시보드를 직접 확인해보니
    **`google_accounts` 테이블 자체가 없었음**. 18번 결정에서 `supabase/schema.sql`에 이 테이블을
    추가했는데, 그 시점에 스키마 재실행을 사용자에게 다시 안내하지 않아서(9.6 문서화 당시 놓침)
    실제 프로젝트엔 한 번도 반영이 안 된 상태였음.
    - 이게 "연결됐습니다"로 잘못 표시된 이유: `src/lib/google-account.ts`의
      `saveGoogleRefreshToken`/`clearGoogleRefreshToken`이 `supabase.from(...).upsert(...)`/`.delete(...)`
      호출 결과의 `{ error }`를 그냥 버리고 있었음 — supabase-js는 쿼리가 실패해도 예외를 던지지
      않고 `{data, error}`만 채워서 돌려주는데, 이 두 함수가 그 `error`를 확인 안 해서 테이블이
      없어 저장이 실패해도 조용히 넘어갔고, `/api/auth/google/callback`의 `try/catch`는 예외가
      안 나서 catch가 못 잡고 그대로 `?google=connected`로 리다이렉트했음. 이제 두 함수 다 `error`가
      있으면 `throw`하도록 고쳐서, 앞으로 비슷한 저장 실패는 콜백의 catch가 잡아서
      `?google=error`로 정확히 표시됨.
    - **사용자가 해야 할 일**: Supabase SQL Editor에서 `supabase/schema.sql` 전체를 다시 한 번
      실행해서 `google_accounts` 테이블을 실제로 생성해야 함(재실행해도 안전하도록 작성돼 있음).
      그 다음 사이드바에서 "Google Drive 연결"을 다시 눌러 재연결.
    - **교훈**: `schema.sql`에 새 테이블/컬럼을 추가할 때마다 "다시 실행 필요"를 그 자리에서
      명시적으로 안내할 것(15번 결정 이후 계속 지켜온 관례인데 18번에서 빠뜨림). 그리고
      supabase-js 쓰기 호출은 항상 `{ error }`를 구조분해해서 확인할 것 — 예외를 던지지 않는
      라이브러리라 확인 안 하면 실패가 조용히 성공처럼 보인다.

23. **(2026-09-19 추가) 사이드바 계정 영역 — 텍스트 링크를 아이콘 버튼으로 교체**: "Google Drive
    연결됨 · 재연결 · 로그아웃"이 260px 사이드바 폭 안에서 줄바꿈되던 문제. 캔버스 시안
    (https://claude.ai/artifact/Fm71GVEBC45mvpqR2QKVCj) 컨펌 후 반영.
    - `app-sidebar.tsx`에 로컬 `AccountIconButton` 컴포넌트 추가 — 아이콘 버튼 하나 + hover 시
      뜨는 툴팁(Tailwind `group`/`group-hover:opacity-100`, 별도 CSS/라이브러리 없음).
    - 연결됨: Cloud 아이콘(accent 배경, 툴팁 "Google Drive 연결됨") + RefreshCw 아이콘(링크, 툴팁
      "재연결"). 미연결: Cloud 아이콘 하나(링크, 툴팁 "Google Drive 연결"). 오른쪽 끝은 항상
      LogOut 아이콘(툴팁 "로그아웃") — 세로 구분선으로 분리.
    - 사이드바 폭(260px, DESIGN.md 5번)은 그대로 유지 — 이번 문제만으로 전체 레이아웃 폭을
      바꾸지 않기로 함(다른 화면에도 걸려있는 값이라).
    - 별개로 논의된 것: `AppSidebar`를 공용 `layout.tsx`로 옮기지 않고 화면마다
      (`week-board.tsx`/`para-board.tsx`/`container-detail-screen.tsx`) 각자 데이터 훅을 불러
      배선하는 구조인 이유를 질문받음 — 답은 (a) 보관함의 `useDroppable`이 그 화면 자신의
      `<DndContext>` 안에 있어야만 드래그가 되고, (b) 캘린더 화면을 먼저 만들고 PARA를 그 패턴
      그대로 확장한 개발 순서 때문(11~12번 결정). todos/컨테이너 상태를 전역으로 한 번만
      가져오게 리팩터하는 건 범위가 커서 **다음에 별도로 진행하기로 함** — 지금은 착수 안 함.

24. **(2026-09-22 추가) `drive.file` 스코프의 진짜 한계 발견 + Google Picker 연동**: 사용자가
    프로젝트를 만들고 Drive 폴더가 자동 생성된 뒤, 그 폴더에 Drive 웹사이트에서 직접 시트/PDF
    파일을 넣었더니 앱의 자료 탭에서 안 보인다고 보고함. 원인은 버그가 아니라 `drive.file`
    스코프의 정책 자체 — 이 스코프는 앱이 만들었거나 사용자가 Google Picker로 명시적으로 연
    파일에만 접근을 허용해서, Drive 웹사이트에서 직접 얹은 파일은 API가 원천적으로 못 본다.
    자세한 검토(스코프 확장 vs Picker vs 재업로드)와 구현 내용은 PLANNING.md 9.9 참고. 요약:
    - `google-drive.ts`에 `getAccessToken`(refresh token → 단기 access token 교환,
      **refresh token은 절대 브라우저로 안 나감**) + `addFileToFolder` 추가.
    - `GET /api/drive/access-token`, `POST /api/drive/import` 두 라우트 추가.
    - `src/lib/google-picker.ts`(클라이언트 전용) — Google Picker 로더 스크립트를 동적으로
      불러와 그 컨테이너의 Drive 폴더를 시작 위치로 하는 다중 선택 Picker를 띄움.
    - 자료 탭에 "Drive에서 가져오기" 버튼 추가(`files-tab.tsx`/`container-detail-screen.tsx`).
    - 새 환경변수 `NEXT_PUBLIC_GOOGLE_API_KEY` 필요 — Google Cloud Console에서 "Google Picker
      API" 활성화 + API 키 발급(HTTP 리퍼러 제한) 필요, README.md에 단계별로 정리해둠(사용자가
      아직 안 해봄 — 이 설정 전까지는 "가져오기" 버튼을 눌러도 에러 메시지만 뜸).

25. **(2026-09-27~28 추가) 공통 앱 셸 리팩토링 + 애플 스타일 리디자인**: 23번에서 미뤄둔 "사이드바를 화면마다
    배선하는 구조"를 사용자가 직접 지적 — "사이드바는 모든 화면 공통인데 왜 화면별로 따로 그리려 하냐,
    화면별로 달라질 수 있는 코드라면 리팩토링하라". 계획은 [REFACTORING-PLAN.md](./docs/plans/done/REFACTORING-PLAN.md)
    (단계별 진행 상황 · 코드 대조 결과 포함), 시안은 https://claude.ai/artifact/EAnz3ttkMqj676NhTXjP7b.
    - **1단계 데이터 단일화** `src/lib/app-data/` — `AppDataProvider` + `useTodos`/`useContainers`/`useTodoActions`/`useSession`.
    - **2단계** `src/app/(app)/layout.tsx` 라우트 그룹 — 사용자 · Drive 연결 조회와 데이터 구독을 한 번만(화면 이동 시 재조회 없음).
    - **3단계 DnD 단일화** `src/lib/dnd/` — `DndProvider` 하나 + `handle-drop.ts` 한 곳. 드롭 영역은 `data`로 자신을 선언.
      동작 변화: PARA 화면에서 매핑된 Inbox 항목을 Inbox 안에서 끌면 매핑 해제 → 순서 변경.
    - **4단계 셸 이전** `src/components/shell/` — 레이아웃에서 한 번만 렌더링, props 없음. **ESLint `no-restricted-imports`로
      화면에서 셸 import 금지**(DESIGN.md 5번). 이제 화면별로 사이드바가 달라질 수 있는 구조 자체가 없음.
    - **5단계 코드 대조** — FEATURES.md 기준 누락 없음 확인. 대조 중 Google OAuth 콜백의 오픈 리다이렉트(`state`를 검사 없이
      redirect에 사용)를 발견해 앱 내부 경로만 허용하도록 수정.
    - **6단계 리디자인** — 사용자 요구: ① 메뉴에 캘린더 · PARA · Inbox, ② 오른쪽 상단 드롭다운으로 월/주 전환,
      ③ Inbox는 PC에서 팝업이 아니라 본문을 밀어내서 월요일 등 왼쪽 영역을 가리지 않게, ④ 애플 디자인 + 팔레트를 애플스럽게,
      ⑤ 미니 캘린더는 애플 캘린더 방식(제목 클릭 팝오버). 260px 사이드바 → 76px 레일 + 밀어내는 Inbox 패널 + 계정 메뉴
      (Drive 연결/재연결 · 로그아웃), 캘린더 툴바(`calendar-header.tsx`), PARA 목록/상세 재디자인, 팔레트 교체(토큰 이름 유지).
      자세한 규칙은 DESIGN.md(전면 갱신).
    - **확인 못 한 것**: 이 세션 환경엔 Supabase 키가 없어 브라우저에서 실제로 띄워보지 못함(타입 검사 · 린트 · `next build`만
      통과). 드래그 앤 드롭 · 모바일 바텀시트 · Drive 재연결 복귀는 로컬에서 손으로 확인 필요 — REFACTORING-PLAN.md 5단계 목록 참고.
26. **(2026-09-28 추가) "Drive에서 가져오기" 권한 에러 수정 — Picker `setAppId` 누락**: 사용자가
    Picker로 구글 시트를 골랐더니 `The user has not granted the app 309998499567 write access to
    the file ...` 에러. 원인: `drive.file` 스코프에서 Picker 선택으로 파일 권한을 앱에 부여하려면
    `PickerBuilder.setAppId(<Cloud 프로젝트 번호>)`가 필수인데 빠져 있었음(없어도 Picker는 멀쩡히
    뜨고 선택도 돼서 `/api/drive/import`의 `files.update`에서야 실패). 프로젝트 번호는 OAuth
    클라이언트 ID 앞부분(`<번호>-....apps.googleusercontent.com`)과 같아서 `getPickerAppId()`
    (google-drive.ts)로 서버에서 뽑아 `/api/drive/access-token`이 `appId`로 같이 내려줌 — 새
    환경변수는 안 늘림.
27. **(2026-09-28 추가) 할 일 상세 팝업 z-index 버그 수정 + 하위 할 일(서브 할 일)**: 사용자가 Inbox에서 할 일을 눌러 연
    팝업이 캘린더 뒤에 깔려 클릭 · 수정이 안 된다고 제보 — 팝업이 sticky인 Inbox 패널(자체 쌓임 맥락) 안에서 그려져
    캘린더의 현재 시각 선 · 블록이 위로 올라온 것. `createPortal`로 `document.body`에 띄워 해결. 이어서 요구: "업무" 같은 할 일
    아래 체크박스로 하위 할 일을 관리하고 진행률을 할 일에 표시. 시안 https://claude.ai/artifact/7Wfuo8WtjAY2TQrgX5GavY 컨펌 →
    계획 [SUBTASKS-PLAN.md](./docs/plans/done/SUBTASKS-PLAN.md) → 1~8단계 구현.
    - **합의 규칙**: 한 단계만, 하위는 내용 · 완료 · 순서만(날짜/PARA 없음), 완료 자동 연동 없음, 노트엔 UI 없음(데이터는 유지),
      PARA 진행률은 할 일 개수 기준 그대로.
    - **DB**: `todo_subtasks` 별도 테이블(jsonb 컬럼이면 두 기기 동시 체크 시 덮어씀) + RLS(부모 할 일도 내 것인지 확인) + cascade + Realtime.
    - **DB 변경 방식 변경**: SQL Editor가 약 249줄까지만 붙여넣기돼서 **schema.sql은 더 늘리지 않고** `supabase/migrations/날짜_이름.sql`로
      분리(사용자 요청). `20260928_todo_subtasks.sql`은 사용자가 실행 완료.
    - **표시**: Inbox · PARA 카드 링 + `2/4`, 주 보기 블록(개수 · 바 · 남는 높이만큼 목록, 바로 체크), 월 보기 `2/4`,
      상세 팝업 체크리스트, PARA 상세 Tasks에서 › 펼치기, 그립으로 순서 변경(같은 할 일 안에서만 — `collision.ts`에서 제한).
    - **확인 못 한 것**: 브라우저 실사용(Supabase 키 없음). tsc · eslint · build, 로컬 PostgreSQL로 마이그레이션 · RLS, 스크립트로
      드롭/충돌 로직만 확인. 실사용 체크리스트는 SUBTASKS-PLAN.md 7번.

28. **(2026-09-28 추가) 회고(잘한 점 · 아쉬운 점 · 다음엔) + 할 일 상세 팝업 탭 구조**: 사용자 요청 — 할 일에 👍/👎를 가끔
    남기고, 나중에 프로젝트 단위로 모아 전체 회고에 쓰고 싶다(메모에 섞으면 모을 수 없음). 개념 합의 → 시안
    https://claude.ai/artifact/6vXMvW1raTc9Dhx9j25yNq (사용자 제안으로 종류 선택은 토글 → 드롭다운, 상세 팝업은 탭으로) 컨펌 →
    계획 [REFLECTIONS-PLAN.md](./docs/plans/done/REFLECTIONS-PLAN.md) → 구현.
    - **합의 규칙**: 종류는 KPT 3개(keep/problem/try), 할 일에 여러 개 또는 **프로젝트에 직접**(할 일 없이), 노트/스크랩엔 없음
      (할 일 → 노트 전환 시 숨기기만), 할 일 삭제 시 회고도 삭제. Area/Resource에는 회고 탭 없음(1차).
    - **DB**: `todo_reflections`(todo_id 또는 project_id 정확히 하나, `converted_todo_id`) — `supabase/migrations/applied/20260928_todo_reflections.sql`.
      할 일 회고는 project_id를 저장하지 않고 할 일의 **현재 매핑**으로 모은다(할 일을 옮기면 회고도 따라감).
    - **할 일 상세 팝업**: 고정 머리(체크 · 제목 · 일정 · PARA) + 탭 3개(하위 할 일 `2/4` · 회고 개수 · 메모·URL 점) + 고정 바닥.
      탭 본문 높이 300px 고정. **완료된 할 일은 회고 탭으로 열림**(완료 시 "한 줄 회고?"를 묻는 대신). 노트는 탭 없음.
    - **PARA 상세(Project) 회고 탭**(`?tab=retro`): 프로젝트 전체 회고 입력 + 3열 보드, 출처 할 일을 누르면 그 할 일 상세,
      "다음엔 → 할 일로"(Inbox에 이 프로젝트로 매핑해서 생성), "회고 노트로 저장"(자료 탭 편집기에 채워서 열기 — 고친 뒤 저장).
    - `addTodo`가 PARA 매핑을 받고 새 id를 돌려주도록 바뀜(클라이언트에서 id를 정해 insert — 하위 할 일과 같은 방식).
    - `useDismiss`가 Esc를 `preventDefault()`로 표시하고 상세 팝업은 `defaultPrevented`면 안 닫힘 — 팝업 안 메뉴에서 Esc를 누르면 메뉴만 닫힘.
    - **확인**: tsc · eslint · build + 가짜 Supabase(auth/rest 목 서버)에 붙인 실제 앱을 Playwright로 클릭 확인(탭 · 드롭다운 ·
      추가 · 할 일로 · 노트 편집기 열기 · 삭제 시 회고 제거 · 모바일). 실제 Supabase(RLS · Realtime) · Drive 저장은 확인 못 함.
    - `supabase/migrations/applied/20260928_todo_reflections.sql`은 사용자가 실행 완료 → `main`에 머지.

29. **(2026-09-28 추가) 완료된 할 일은 캘린더에서 끌어서 옮길 수 없게**: 사용자 요청. `calendar-block.tsx`의
    `useDraggable`을 `todo.completed`면 `disabled` — 끝난 일정이 실수로 다른 날로 밀리지 않게. 완료를 풀면 다시 옮길 수 있다.
    잠긴 블록은 `touch-none`도 빼서 모바일에서 그 위로 캘린더를 스크롤할 수 있음. 길이 조절(아래 모서리)·상세 열기·완료 체크는 그대로.

30. **(2026-09-28 추가) 모바일 주 보기 기본 요일 = 오늘**: 이번 주를 열면 월요일 대신 오늘이 선택된다(다른 주는 월요일).
    고른 요일은 그 주에만 유효, 미니 캘린더/월 보기에서 날짜를 누르면 그 요일, `오늘` 버튼은 오늘로(`week-board.tsx`).

31. **(2026-09-29 추가) PARA 삭제 · 상세에서 할 일 추가**: 사용자 요청 — 한 번 만든 PARA를 지울 수 없고, 상세에서 할 일을
    못 만들어 불편. 시안 https://claude.ai/artifact/EWAVSDna7Zty2FzGLD2Azb 2차 컨펌 → 계획 [PARA-MANAGE-PLAN.md](./docs/plans/done/PARA-MANAGE-PLAN.md) → 구현.
    - **합의 규칙**: 추가 줄은 할 일 목록 **맨 위**(미완료는 최신순으로 바뀜). 삭제 입구는 **상세 `···` 메뉴에만**. 삭제 기본값은
      **함께 삭제** — 매핑된 할 일 · 스크랩(하위 · 회고 cascade) + **Drive 폴더를 Drive 휴지통으로**(30일 복구 가능). "연결만 끊기"를
      고르면 할 일 · 스크랩 · Drive 폴더가 남는다. 프로젝트 회고는 어느 쪽이든 삭제.
    - **순서**(`lib/app-data/container-actions.ts`): ① Drive 휴지통(`DELETE /api/drive/folder` — 폴더 id는 서버가 컨테이너 행에서
      읽음) → ② 매핑된 할 일 삭제 → ③ 컨테이너 삭제. 앞 단계가 실패하면 멈춘다. Drive 실패면 확인 창에 다시 시도 / "Drive 폴더는 두고 삭제".
      컨테이너 · 매핑된 할 일 삭제는 낙관적이지 않음(성공 후 로컬 반영) — 실패해도 확인 창이 오류와 함께 남도록.
    - DB 마이그레이션 없음(기존 FK: todos 매핑 set null, 프로젝트 회고 · 하위 · 할 일 회고 cascade).
    - **확인**: tsc · eslint · build + 가짜 Supabase(auth/rest 목)에 붙인 실제 앱을 Playwright로 35개 항목 클릭 확인(추가 · Esc ·
      Inbox 노출 · 메뉴 · 기본값 · Drive 실패 → 두고 삭제 · 연결만 끊기 · 빈 컨테이너 · DB 실패 후 재시도 · 없는 주소 · 모바일).
      **실제 Supabase(RLS · Realtime)와 실제 Drive 휴지통 이동은 확인 못 함** — 이 환경에 Google 자격 증명이 없어 Drive 성공 경로는 미확인.

32. **(2026-09-29 추가) 할 일 사진**: 사용자 요청 — 약속 · 여행 같은 일정도 기록하고 싶은데 사진이 있으면 추억 · 다이어리 꾸미기가 된다.
    시안 https://claude.ai/artifact/4pamL9JChaBcYvJZXvfe2c 컨펌(월 보기 full · 주 보기 bg, 여러 날 일정은 이번엔 뺌) → 계획
    [PHOTOS-PLAN.md](./docs/plans/done/PHOTOS-PLAN.md) → 구현.
    - **저장은 Google Drive**(`PLAN.0/사진/<날짜> <이름>`, 썸네일은 `PLAN.0/사진/.thumbs`). DB `todo_photos`엔 Drive 파일 id · 폴더 id · 대표 여부만.
      화면엔 `GET /api/photos/<id>?size=thumb|full`이 Drive에서 읽어 내려준다(파일 id는 서버가 행에서 읽음, 1년 캐시).
    - 할 일을 지우면 행만 지워지고 **Drive 사진은 남는다**. 사진 삭제는 Drive 휴지통(30일 복구).
    - **확인**: tsc · eslint · build + 가짜 Supabase(auth/rest 목)에 붙인 실제 앱을 Playwright로 확인(월 · 주 사진 칸 수, 대표 규칙,
      사진 탭 · 크게 보기 · 대표로 PATCH 순서 · ← → · Esc는 뷰어만 · 올리기 · 삭제, Drive 미연결 안내, 모바일 월 보기). `/api/photos`는
      브라우저에서 가로채 응답 — **실제 Drive 업로드 · 읽기 · 휴지통과 실제 Supabase(RLS · Realtime)는 확인 못 함**(이 환경에 자격 증명 없음).

33. **(2026-09-29 추가) 겹치는 일정 = 애플 캘린더 방식**: 사용자 피드백 — 7:00–7:30 할 일 다음 7:30 업무가 안 겹치는데도 들여써졌다
    (원인: 겹침을 최소 높이 28px로 계산해 BLOCK_GAP만큼 겹친다고 봄). 애플 캘린더에서 직접 확인한 규칙으로 바꿈.
    시안 https://claude.ai/artifact/1xV98C9TMFtRfJDWKgGJcg ④ 컨펌(⑤ "제목 줄만 기준"은 안 씀).
    - 규칙: 안 겹치면 전체 너비 / 아래 블록의 제목 · 시간 줄(36px)을 지나서 시작하면 안쪽에 쏙(왼쪽 9 · 오른쪽 7px, 흰 테두리, 4% 어둡게) /
      그 안에서 시작하면 나란히 같은 너비. 블록 사이 2 → 3px, 최소 높이 28 → 26px(30분 칸).
    - **확인**: tsc · eslint + 가짜 Supabase에 붙인 실제 앱에서 시안의 경우들(안 겹침 · 안쪽 · 같은 시각 · 30분 뒤 · 애플 예시 2개 ·
      30분 연속 3px 틈 · 15분 연속)을 위치 측정 11개 항목으로 확인.

34. **(2026-09-30 추가) 하위 할 일 "나중에(프로젝트로)"**: 사용자 질문 — 업무 하위 할 일에 "시간 될 때" 하는 롱텀 업무가 섞여 매일 넘김으로
    쌓인다. 롱텀 업무는 프로젝트의 날짜 없는 할 일로 분리하기로 하고, 그 입구로 "나중에" 버튼. 시안 https://claude.ai/artifact/4ydwEuprX4JdD8yDsEc9G5
    컨펌(글자 + 아이콘, 옮김 표시 남김) → 계획 [LATER-PLAN.md](./docs/plans/done/LATER-PLAN.md) → 구현. DB 변경 없음.
    - **확인**: tsc · eslint + 가짜 Supabase에 붙인 실제 앱에서 16개 항목(버튼 hover · 완료 항목엔 없음 · 만든 할 일의 이름 · 날짜 없음 · 프로젝트 ·
      메모, 하위 삭제, 알림 문구, 되돌리기로 새 할 일 삭제 + 같은 순서로 복구, 5초 뒤 알림 닫힘, Inbox에 보임). 알림은 시안(팝업 안)과 달리
      화면 아래 가운데 — PARA 상세 펼침에서도 같은 알림을 쓰려고.
35. **(2026-09-30 추가) 아이콘 lucide → Phosphor 교체**: 메모 줄 표시 시안을 보다가 사용자 요청 — "좀 둥글둥글한 아이콘으로".
    시안 https://claude.ai/artifact/JfkwtcvcU885kzNkdJGV7Q ⑥에서 Lucide · Phosphor · Hugeicons · Solar를 같은 아이콘 · 같은 메모 줄로 비교 → Phosphor 선택.
    - 모든 아이콘은 `src/components/icons.ts` 한 곳에서 Phosphor를 **아이콘별 경로**(`@phosphor-icons/react/dist/csr/<Name>`)로 re-export.
      패키지 루트 import는 아이콘 수천 개를 다 읽어 개발 서버가 느려지고(Next가 자동 최적화하는 목록에 Phosphor는 없음), ESLint `no-restricted-imports`로
      `lucide-react` · Phosphor 직접 import를 막음(셸 파일도 별도 블록으로 같은 규칙).
    - 이름은 Phosphor 이름 그대로(ChevronLeft → `CaretLeft`, Trash2 → `Trash`, Inbox → `Tray`, Search → `MagnifyingGlass` 등).
      굵기: lucide `strokeWidth` ≥ 2.2이거나 14px 이하 아이콘은 `weight="bold"`, `fill-current`였던 ★는 `weight="fill"`, 나머지 기본 regular.
    - **확인**: tsc · eslint, 가짜 Supabase 앱에서 캘린더 · Inbox · 할 일 팝업(하위 할 일 · 회고 · 사진) · PARA 화면 스크린샷.
36. **(2026-09-30 추가) 메모 줄 표시 1단계(표시 · 툴바 · 보기 모드)**: [MEMO-MARKS-PLAN.md](./docs/plans/done/MEMO-MARKS-PLAN.md) 2~4번을 구현.
    시안 https://claude.ai/artifact/JfkwtcvcU885kzNkdJGV7Q ①②③ 그대로. 저장은 메모 원문(DB 변경 없음).
    - 글자 고치기는 전부 `lib/memo-marks.ts` 순수 함수(`parseMemoLines` · `applyMark` · `toggleDone` · `resolveQuestion` · `reopenQuestion` ·
      `continueOnEnter`). 편집 칸 글자는 `execCommand("insertText")`로 넣어 브라우저 되돌리기가 그대로 된다(안 되면 `setRangeText`로 대체).
    - 표시가 하나도 없는 메모는 전처럼 통째 텍스트로 보이고, 하나라도 있으면 줄 단위 보기(불릿 줄 = 회색 점, 불릿 없는 줄 = 빈 칸으로 줄 맞춤).
    - 툴바를 누르는 동안 입력칸 blur로 편집이 끝나지 않게 mousedown 기본 동작을 막고, 터치용으로 누르는 중 플래그도 본다.
    - `?`의 원 없는 `i`는 Phosphor에 없어서 `memo-view.tsx`의 `InfoGlyph`로 직접 그림. 색은 `--mark-*` 토큰(다크 포함).
    - 모아보기(검색 패널 칩 `확인할 것 N` · `질문 N`, MEMO-MARKS-PLAN.md 5번)는 37번 검색과 같이 완료.
    - **확인**: tsc · eslint, 순수 함수 단위 확인(인식 규칙 · 툴바 붙이기/바꾸기/떼기 · 여러 줄 · 예전 표시 · Enter), 임시 페이지에서 Playwright로
      체크 · 질문 해결(Enter/Esc) · 되돌리기 · 줄 눌러 편집(커서 줄) · 툴바 · Enter 이어 쓰기 · ⌘Z · 여러 줄 선택 확인 + 스크린샷.
      로그인이 필요한 실제 할 일 팝업 안에서는 아직 못 봄.
37. **(2026-09-30 추가) 검색**: [SEARCH-PLAN.md](./docs/plans/done/SEARCH-PLAN.md) 1~5단계. 시안 https://claude.ai/artifact/EXRxgXo2Cpn1oNFvj9DBCx 컨펌
    (가운데 ⌘K 팝업, 모바일은 **탭바 6칸 A안** + 전체 화면). **키워드 검색만** — 벡터 · AI는 케이스가 쌓이면(SEARCH-PLAN.md 7번).
    - 서버 · DB 변경 없음: 이미 다 불러와 있는 할 일 · 하위 할 일 · PARA로 브라우저에서 색인(`lib/search.ts` 순수 함수, `use-search`가 `useMemo`).
      규칙은 SEARCH-PLAN.md 3번(조사 떼기 · 하이픈 무시 · 절반 이상 일치 · 줄 ×3 / 제목 ×2 / PARA ×1). `scripts/check-search.ts`(`npx tsx`)로 기준 케이스 확인.
    - 이모지만 · 줄 표시(`[?]` 등) 검색과 칩(`확인할 것` · `질문`)은 점수 없는 "줄 모드" — 메모 줄 표시 모아보기(MEMO-MARKS-PLAN.md 5번)도 이걸로 완료.
    - 결과를 누르면 검색 패널 위에 할 일 팝업(일치한 곳의 탭, `initialTab`) → 닫으면 검색으로. `todo-detail-by-id.tsx`를 프로젝트 회고 탭에서 꺼내 같이 씀.
    - **회고 결과 종류는 없앰**: 사용자가 회고 데이터를 모두 메모 줄(`[p]` `[c]` `[I]`)로 옮겼다(회고 테이블 비어 있음).
    - **사용 방식 변화(같은 날)**: "누군가에게 물어보고 답을 들은 것"을 하위 할 일 `📝 답` 대신 **메모 `[?]` → `[i] 질문 → 답`** 으로 적기로 함.
      검색 결과에서 `[i]`의 답을 진하게, 메모가 가장 잘 맞으면 메모 스니펫을 위로. 기준 케이스 1도 메모 형태로 바꿈(📝 형태는 예전 기록용으로 계속 지원).
    - **확인**: tsc · eslint · build · check-search 13개 + 가짜 Supabase(auth/rest 메모리 목 — 로그인 쿠키 `sb-127-auth-token`에 가짜 세션)에 붙인
      실제 앱을 Playwright로(기준 케이스 · 📝 · 결과 없음 · ↑↓ · 칩 체크/해결 → 메모 저장 · 결과 열기 탭 · Esc 복귀 · PARA 이동 · 모바일 탭바 6칸).
      목 서버는 저장소에 넣지 않았다 — 필요하면 `/auth/v1/user` + `/rest/v1/<table>`(GET은 `content-range` 헤더) 정도로 다시 만들면 된다.
38. **(2026-09-30 추가) 회고 → 메모 줄(회고 탭 정리)**: [MEMO-MARKS-PLAN.md](./docs/plans/done/MEMO-MARKS-PLAN.md) 7번(2단계). 시안 ⑦⑧⑨
    (https://claude.ai/artifact/JfkwtcvcU885kzNkdJGV7Q) 컨펌 + 추천안 두 가지 컨펌(프로젝트 전체 회고 = 노트, 회고 테이블 삭제).
    - 사용자가 하나뿐이던 회고를 직접 메모로 옮겨 `todo_reflections`는 0건 → 옮기기 스크립트 없이 **회고 코드 · 스토어 · 테이블을 없앰**
      (`components/reflection/*`, `lib/reflection.ts`, `lib/supabase/reflections.ts`, `use-reflections`, `reflection-actions`, `Reflection` 타입).
      테이블은 `supabase/migrations/applied/20260930_drop_todo_reflections.sql`로 지움 — 새 코드 배포 뒤 실행 완료(2026-09-30).
    - 할 일 팝업 탭 3개(하위 할 일 · 메모·URL · 사진), 완료된 할 일은 메모 탭으로. 빈 메모면 회고 버튼 3개로 한 줄 유도,
      표시만 치고 안 적은 줄은 저장하지 않음(`commitMemo`).
    - 프로젝트 회고 탭은 `lib/retro.ts` 순수 함수로 메모 줄을 모음. 프로젝트 전체 회고는 "〈프로젝트〉 회고" 노트 메모에 줄로(DB 변경 없음),
      "다음엔 → 할 일로"는 메모 줄 끝 ` → 할 일로 만듦`. `--retro-*` 색은 `--mark-*`로 합침. REFLECTIONS-PLAN.md는 "대체됨" 기록으로만 남김.
    - **확인**: tsc · eslint · build · check-search + `lib/retro.ts` 단위 확인(모으기 · 순서 · 할 일로 표시 · 노트 찾기 · 마크다운) +
      가짜 Supabase 앱에서 Playwright(완료 → 메모 탭 · 빈 메모 유도 · 표시만 치면 저장 안 함 · 회고 줄 + 안내 문구 · 프로젝트 회고 3열 ·
      프로젝트 전체 회고 → 노트 생성 후 이어 붙이기 · 할 일로 · 줄 → 메모 탭) + 스크린샷.
39. **(2026-09-30 추가) PARA 개요 "남은 것"**: 사용자 질문 — 프로젝트 회고 탭에서 확인 · 질문도 모아보고 싶다.
    회고 탭(Project만 · 지나간 일)이 아니라 **개요 탭**(Project · Area · Resource)에 두기로 제안 → 시안 ⑩⑪⑫ 컨펌 → 구현(MEMO-MARKS-PLAN.md 8번).
    - 검색 패널 칩 · 스위치를 `components/search/mark-chips.tsx`로 꺼내 같이 쓰고, 줄은 `MarkLineRow` 그대로. 목록 = 그 PARA 할 일만으로 만든 검색 색인의 줄 모드.
    - **확인**: tsc · eslint · build · check-search + 가짜 Supabase 앱에서 Playwright 9개(칩 개수 · 기본 칩 · 질문 · 끝난 것도 보기 · 해결 → 메모 저장 ·
      체크 → 줄 사라짐 · 줄 → 메모 탭 · 줄 없는 Area는 카드 숨김 · 모바일 · 검색 패널 칩 그대로) + 스크린샷.
40. **(2026-09-30 추가) 메모 탭 남은 개수 뱃지**: 할 일 팝업 "메모 · URL" 탭에 열린 `[?]` + `[ ]` 합계를 회색 알약으로(MEMO-MARKS-PLAN.md 9번).
    시안 ⑬~⑯에서 종류별 표시(질문 · 확인 칸 따로)를 그렸다가 "탭이 좁다, 뱃지 하나로"(⑰ D안) 컨펌. 탭 이름은 "메모 · URL" 유지.
    - **확인**: tsc · eslint · build + 가짜 Supabase 앱에서 데스크톱 · 모바일 폭 한 줄, 해결 · 체크하면 2 → 1 → 점.
41. **(2026-10-01 추가) 메모 링크 — "나중에" 원래 할 일 연결**: [LINKS-PLAN.md](./docs/plans/done/LINKS-PLAN.md). 사용자가 회의에서 나온 할 일을 회의의 하위 할 일로
    적고 "나중에"를 눌러 출처를 남기는 식으로 쓰고 있어서, 메모를 옵시디언 내부 링크 `- [[이름(10/1)]]에서 옮김`으로 바꾸자는 제안.
    시안(https://claude.ai/artifact/24GBhW8d4UHbpprCRwPXtv) + 추천안 4개 컨펌: 형식(`에서 옮김`은 괄호 밖) · 원래 할 일에 "나중에로 옮긴 할 일" 목록 ·
    이름 · 날짜 바뀌면 링크 자동 고침 · 예전 메모는 원문 그대로 두고 링크로 읽기.
    - 이름 + 날짜로 찾으므로 DB 변경 없음. 링크 고치기는 `lib/supabase/todos.ts` `updateTodo` 한 곳(제목 · 드래그 · 노트 전환 모두 지나감).
    - 링크로 연 할 일은 같은 `TodoDetailModal`을 안에 한 번 더 렌더링(body 포털이라 위에 뜸) — Esc는 위 팝업만.
    - **확인**: tsc · eslint · build · `scripts/check-links.ts`(찾기 · 같은 M/d 다른 해 · 예전 줄 · 역링크 · 이름 · 날짜 · 별칭 고치기) · check-search +
      임시 페이지에서 링크 · 예전 줄 · 끊긴 링크 · 옮긴 할 일 목록 스크린샷. 실제 앱(로그인) 확인은 못 함 — 이 세션에 Supabase 키가 없었음.
42. **(2026-10-01 추가) Inbox PARA 그룹**: "Inbox가 구분 없이 만든 순으로 쌓여 난잡하다, TickTick 인박스처럼 PARA별 아코디언 + 개수".
    시안 https://claude.ai/artifact/NagRGwGtAevetvXLLSrr2p 에서 A안(섹션 머리) · B안(흰 카드) · C안(종류로만 묶기)을 비교 → **A안 + ④ 다른 그룹으로 끌어 놓기** 컨펌.
    계획 · 규칙은 [INBOX-GROUPS-PLAN.md](./docs/plans/done/INBOX-GROUPS-PLAN.md). 완료 · 보관 그룹 위치는 답이 없어 제안대로 맨 아래.
    - `lib/inbox-groups.ts`(묶기 · 순서 · 접힘 localStorage), 드롭 대상 `inbox-group`, 그룹별 `SortableContext`(다른 그룹 카드는 비키지 않는 전략),
      `handle-drop.ts`에 그룹 매핑. Inbox 카드에 PARA 이름(`badge`)은 더 안 붙인다.
    - 할 일 상세 팝업은 Inbox 패널이 연다(`TodoCard` `onOpenDetail` → `TodoDetailById`) — 팝업에서 PARA를 바꾸면 카드가 다른 그룹으로 옮겨
      다시 마운트되면서 팝업이 닫히던 문제 방지.
    - **확인**: tsc · eslint · build + 가짜 Supabase 앱에서 Playwright(그룹 순서 · 개수 · 접기 새로고침 후 유지 · 머리 위 / 다른 그룹 카드 위 /
      접힌 그룹 / 미분류로 끌기 · 같은 그룹 순서 변경 · 미분류 접고 새로 적기 → 펼침 · 캘린더 블록은 PARA 유지 · PARA 상세 카드 → 그룹 ·
      팝업에서 PARA 바꿔도 팝업 유지 · 모바일 바텀시트) + 스크린샷.

43. **(2026-10-01 추가) 시간 균형 — 영역별 한 주 시간**: [BALANCE-PLAN.md](./docs/plans/done/BALANCE-PLAN.md). 사용자가 예전에 쓴 종이 **타임트래커**(퇴사한 이형)에서
    손 기록은 안 맞았지만 "영적 · 지적 · 사회적 · 신체적 · 기타로 일주일 시간을 보는 것"은 좋았다 → plan.0에 도입. 개념부터 여러 번 논의해서 합의:
    - **영역 = 컨텍스트**(새 개념 안 만듦). **건강 · 지적 · 업무 · 관계 · 기타(기본)** + **수면**(따로) + **공백**(기록 없는 깨어 있는 시간, 안 나눔).
      영적은 종교가 아니라 성찰이라는 설명 뒤 "마음 vs 관계" 고민 → 업무에 밀리는 축을 보려고 **관계**. "사회"는 두 글자 맞춰 **업무**로.
    - **체크한 캘린더 블록만** 센다 — 사용자는 실제 한 시간으로 블록을 고치므로 캘린더 = 기록. 겹친 시간은 한 번만(짧은 블록이 가져감).
      **수면도 블록으로 직접 입력 · 체크**(아침에 기상 시간 고치며 체크하는 게 루틴, 예외 처리 안 함). 168시간 = 수면 + 영역 + 공백.
    - **집중 모드는 영역별**, 꺼지면 **전부**(`/api/context` `{"context": "all"}`).
    - 보여주는 곳 = **목표 화면**(스크린 타임 방식: 요일별 누적 막대 + 영역 목록 + 지난주 같은 시점 대비). 색은 **목표 화면 먼저**,
      캘린더 블록 · PARA 색을 컨텍스트 색으로 바꾸는 건 다음 단계.
    - 시안 https://claude.ai/artifact/DfzCfv9eci2fj5k5F6mXXc (① 목표 화면 ② 모바일 ③ 자정 넘는 블록 ④ 팝업 시간 편집 ⑤ 컨텍스트 관리 ⑥ 색) 컨펌 → 4단계 구현 → `main` 머지.
    - **1단계 자정을 넘는 블록 + 팝업 시간 편집**(데이터 변경 없음): 두 날에 두 조각, 손잡이는 다음 날 조각, 다음 날 조각 드래그 id `<id>:tail` +
      `offsetMinutes`. 자정을 안 넘던 블록은 끌어서 넘기지 않음(팝업에서만). 팝업 일정 줄 → 시작 · 끝(끝 < 시작 = 다음 날). `isCarryDue`도 다음 날 끝을 바르게.
    - **2단계 컨텍스트 색 · 수면으로 세기**: 마이그레이션 `20261001_context_balance.sql`(`color` 8색 · `is_sleep` 사용자당 하나) — **실행 완료**.
      관리 팝업 색 점 · 색 8개 · 수면으로 세기, 새 컨텍스트는 안 쓰는 첫 색, `all` · `default`는 예약 키.
    - **3단계 계산** `lib/balance.ts`(순수 함수) + `useBalance`. **4단계 화면** `goals/balance-section.tsx`. 수면을 한 주만 기록했으면 공백은 비교 안 함.
    - **확인**: tsc · eslint · build + `scripts/check-overnight.ts` · `scripts/check-balance.ts`, 마이그레이션은 로컬 PostgreSQL 16(재실행 · 색 안 덮음 ·
      잘못된 색 · 수면 둘 · RLS), `all`은 가짜 Supabase로 요청 확인, 시간 균형 화면은 가짜 데이터 임시 페이지 스크린샷(데스크톱 · 모바일).
      실제 앱(로그인) 확인은 못 함. 머지 전 DESIGN.md에서 2단계 편집 때 지워진 "자정을 넘는 블록" 항목 머리를 복구.
    - 사용자가 만들 컨텍스트 키: 업무 `work` · 기타 `personal`(기존, 이름만 바꿈) · 건강 `health` · 지적 `knowledge` · 관계 `relationship` · 수면 `sleep`
      + 나중에 추가한 생활 `life`(44번 — 사용자가 만들었다고 확인). 나머지 영역을 다 만들었는지는 확인 안 됨.

44. **(2026-10-01 추가) 색 = 영역(컨텍스트)**: 생활 / `life` 영역을 만든 뒤 "캘린더 색이 그대로네?" → 43번에서 미뤄둔 다음 단계를 바로 진행.
    "내집마련" 같은 프로젝트는 기타가 아니라 **생활** 영역으로(기타는 "아직 분류 안 함" 신호로 남겨 두려고).
    - 시안 https://claude.ai/artifact/9V2Fz7bEfE3DhEqha5kyPg(주 · 월 · Inbox · PARA 목록/상세 · 할 일 팝업, 지금 / 바꾼 뒤) 컨펌 —
      **Inbox 그룹 머리는 종류 아이콘 말고 점(영역 색) 그대로**(사용자 결정). 팝업 라벨은 `프로젝트 · 생활`.
    - `lib/app-data/use-para-color.ts` `useParaColor()`(`ofMapping` · `ofContainer` · `ofContextId` → `{ color, tint, context }`) 하나로 15개 화면의
      PARA 종류 색을 바꿈. `CATEGORY_COLOR_VAR` · `CATEGORY_TINT_VAR`는 없앰(실수로 다시 쓰지 않게). PARA 카드 칩은 카드가 스스로 읽음.
    - 시간 균형의 펼친 PARA 점도 그 영역 색(한 행 안은 같은 영역).
    - **확인**: tsc · eslint · 4개 스크립트 · build + **가짜 Supabase(auth/rest 목)에 붙인 실제 앱** 스크린샷 — 주 · 월 보기, Inbox 그룹, PARA 목록 · 상세,
      할 일 팝업, 목표 화면 시간 균형(43번 화면도 처음으로 실제 앱에서 확인). 목 서버는 커밋하지 않음 — 다시 만드는 법은 맨 아래 "가짜 Supabase로 실제 앱 띄우기".
    - `main` 머지 완료(`6c880bf`). 같은 날 43번 머지(`13eb938`) · HANDOFF 정리 머지(`0bba8db`)도 있음.
45. **(2026-10-02 추가) Inbox 그룹 기본 접힘**: "무조건 펼쳐지니까 계속 접어야 해서 귀찮다, 디폴트를 접은 상태로". 42번은 기본 펼침 + 접은 그룹을
    기억했는데, 이제 **기본 접힘 + 펼친 그룹만 기억**(`useInboxExpanded`, 키 `plan0.inboxExpanded`). 예전 키는 안 읽어서 배포 후 한 번 전부 접힌 채 시작.
    Inbox 입력창으로 새로 적으면 미분류는 지금처럼 펼친다(방금 쓴 게 보이게).
46. **(2026-10-02 추가) 모바일 Inbox 바텀시트 낮추기**: "인박스 영역이 너무 커서 캘린더에 배치할 수가 없다, 이제 접힌 상태로 필요한 것만
    펼치니까 좀 더 낮춰줘". 고정 `h-[62vh]` → **내용 높이 + 최대 `50dvh`**(그룹이 기본 접힘이라 보통 훨씬 낮음, 펼치면 절반까지 늘고 그 안에서 스크롤).
    - **확인**: 가짜 Supabase 앱 390px — 그룹 3개 접힘이면 시트 268px(위로 캘린더 오전 7시~오후 1시가 보임), 많이 펼치면 422px(50dvh)에서 멈추고 목록 스크롤,
      시트의 카드 → 캘린더로 끌어 배치.
47. **(2026-10-02 추가) 메모 · 하위 할 일 바깥 링크**: [WEB-LINKS-PLAN.md](./docs/plans/done/WEB-LINKS-PLAN.md). 메모 줄에 SAP 노트를 `[이름](https://…)`로 적는데
    글자로만 보여서 → 마크다운 링크 · 그냥 주소를 파란 글자 + `↗`(시안 https://claude.ai/artifact/PTUfxPwAQ2usF9UeeRaCdj **A안** 컨펌).
    **할 일 제목은 빼기로**(사용자 결정). 팝업 메모 보기 · 하위 할 일 목록에서만 누를 수 있고(새 탭), 캘린더 블록 · 검색 · 남은 것 · 회고는 이름만.
    글자를 고르고 주소를 붙여넣으면 `[글자](주소)`. 같은 날 "확인 줄에도 답 달기"는 하지 않기로 함(MEMO-MARKS-PLAN.md 10번).
    - **확인**: tsc(`next typegen` 뒤) · eslint · `scripts/check-web-links.ts` · check-links · check-search + 임시 페이지(`/login/…`, 지움)에서 Playwright —
      `MemoView` 링크 모양 · 색(완료 줄 회색) · 새 탭 · 링크 클릭은 편집 안 들어감 · 줄 클릭은 편집 · 붙여넣기 변환 + 스크린샷.
      하위 할 일 목록 · 검색 결과는 실제 앱(가짜 Supabase)으로는 못 봄.
48. **(2026-10-02 추가) 표시 없는 목록 메모도 점으로**: 사용자는 메모를 주로 `- ` 목록으로 쓰는데, 표시(`[ ]` · `[?]` …)나 링크가 없으면
    팝업이 메모를 원문 글자로 그려 `-`가 그대로 보였다 → 목록 줄이 하나라도 있으면(`hasMemoBullets`) 보기 모드(`MemoView`)로 — 회색 4px 점 · 번호.
    목록 줄이 없는 문단 메모는 전처럼 글자 그대로(보기 모드는 줄 앞 칸만큼 들여쓰기 때문).
    - **확인**: tsc · eslint + `hasMemoBullets` 단위 확인(사용자 메모 · `-5도`처럼 공백 없는 `-` · `1. `). 보기 모드 점 모양은 47번 임시 페이지에서 본 그대로.

## 지금 구현된 것 (기능 목록)

- Todo List(전역 보관함, 사이드 패널) + Mon~Sun **시간 단위 캘린더 그리드** (0~24시, 스크롤 가능)
- 할 일(체크박스 있음) / 노트(체크박스 없음, 참고용) 두 종류 — 보관함에서 서로 전환 가능, 노트는
  PARA에 매핑되면 보관함에서 사라짐 (13번 결정 참고)
- 할 일 추가(보관함) / 클릭해서 텍스트 수정 / 삭제 / 완료 체크(원형 체크박스, Reminders 스타일)
- 드래그 앤 드롭: 보관함 ↔ 요일·시간 칸 이동, 예약된 블록을 다른 요일/시간으로 이동,
  보관함 내 순서 변경 ([`@dnd-kit`](https://dndkit.com/), 충돌 감지는 `src/lib/dnd.ts`의
  `preferSpecificTargetCollision` — 보관함 패널과 다른 드롭 영역이 겹쳐도 실제 대상을 우선함)
- 예약된 할 일은 **소요 시간에 비례하는 높이의 블록**으로 표시(시간 범위 라벨 포함),
  **블록 하단 모서리를 드래그해서 소요 시간을 리사이즈** 가능 (15분 단위 스냅)
- 오늘 요일 칸에 현재 시각을 가리키는 빨간 라인 표시 (client-only 계산, `use-today.ts`)
- 주차 이동 (`< 37주 >`, "이번 주" 바로가기, 오늘 날짜에 원형 표시)
- **월별 뷰** (`month-calendar.tsx`) — 사이드바 미니 캘린더의 월 라벨을 누르면 전환, 날짜 칸을 누르면
  그 주의 주별 뷰로 돌아감. "캘린더" 메뉴는 항상 이번 주 주별 뷰로 이동 (16번 결정 참고)
- 데스크톱: 왼쪽 고정 사이드바(`AppSidebar`)에 브랜드/빠른 추가/미니 캘린더/보관함(항상 펼침)/
  캘린더·PARA 전환/계정. 모바일: 하단 탭바(`IconRail`, Todo/캘린더/PARA) + "Todo" 탭으로 여는
  보관함 바텀시트 (14번 결정 참고)
- 모바일: iOS 캘린더 느낌의 요일+날짜 원형 스트립으로 하루씩 보기
- 로그인(이메일·비밀번호), 로그아웃 — 가입 버튼은 개인용이라 주석 처리해둠
- Supabase 실시간 동기화 (다른 기기/탭에서 바뀐 내용 자동 반영)
- 공유하기 → 애플 단축어로 링크 스크랩 (`/api/clip`) — Todo List에 제목 + URL 임베드 카드로 추가
- 디자인: 미니멀 캘린더형(Notion Calendar/Google Calendar 참고), 웜 크림 배경 + 블루그레이
  프라이머리 팔레트는 유지, PARA 매핑에 따른 카테고리 색상 코딩 (14번 결정, [DESIGN.md](./DESIGN.md) 참고)
- PARA(Project/Area/Resource, `/para`) — 할 일/스크랩을 요일/시간과는 독립적으로 프로젝트·영역·리소스
  중 하나에 드래그로 매핑. 상세 화면(`/para/[kind]/[id]`)에 Overview/Tasks/자료 탭 (8번, 20번 결정 참고).
  목록 화면은 가로 세그먼트 컨트롤 + 카드 그리드, 상세 화면은 캘린더 화면과 `AppSidebar`를 공유
  (12번, 14번 결정 참고)
- 노트/자료(Google Drive 연동) — 컨테이너별 Drive 폴더에 마크다운 노트 + PPT/PDF/이미지 등 첨부를
  저장. Tasks 탭 안 스크랩을 여러 개 골라 하나의 노트로 승격 가능, 노트는 옵시디언 Properties
  스타일의 링크형/태그형 속성을 지원 (PLANNING.md 9번, 20번 결정 참고)
- 하위 할 일(체크리스트) + 진행률 — 상세 팝업에서 관리, Inbox/PARA 카드 · 캘린더 블록 · 월 보기에 `2/4` 표시,
  PARA 상세에서 펼쳐 체크, 드래그로 순서 변경 (27번 결정, SUBTASKS-PLAN.md)
- 메모 줄 표시(`[ ]` · `[?]`/`[i]` · `[p]` `[c]` `[I]`) — 툴바 · Enter 이어 쓰기 · 보기 모드에서 체크/질문 해결 (36번, MEMO-MARKS-PLAN.md)
- 검색(⌘K · 레일 · 탭바) — 키워드 검색 + 확인할 것 · 질문 모아보기, 결과를 누르면 할 일 팝업 (37번, SEARCH-PLAN.md) — 현재 전체 목록은 FEATURES.md
- 색 = 영역(컨텍스트) — 캘린더 블록 · 월 보기 · Inbox 그룹 점 · PARA 카드/상세 · 할 일 팝업 · 목표까지 그 영역 색, PARA 종류는 탭 · 순서 · 아이콘 (44번, DESIGN.md 3번)
- 시간 균형(목표 화면) — 체크한 블록을 컨텍스트(영역)별로 요일 막대 · 목록 · 수면 · 공백, 지난주 같은 시점 대비. 자정을 넘는 블록 · 팝업 시간 편집 ·
  컨텍스트 색 · 수면으로 세기 · 단축어 `all` (43번, BALANCE-PLAN.md)

## 파일 맵

```
PLANNING.md                    기획서 (컨셉/데이터 모델/스택 결정 근거)
README.md                      실행 방법 + Supabase 설정 단계별 가이드
HANDOFF.md                     이 문서
DESIGN.md                      디자인 가이드 — 컬러 토큰/radius/레이아웃 규칙/새 화면 체크리스트 (14번 결정)

supabase/schema.sql            todos + projects/areas/resources 테이블 + RLS 정책 + realtime publication (Supabase SQL Editor에서 1회 실행,
                                재실행해도 안전)
supabase/migrations/            2026-09-28 이후 DB 변경. 날짜별 파일, 기존 프로젝트는 새 파일만 SQL Editor에서 실행.
                                실행이 끝난 파일은 applied/로 옮긴다(2026-10-01~) — 맨 위에 남은 파일 = 아직 실행할 것
.env.local.example             필요한 환경변수 템플릿 (진짜 키는 절대 커밋 안 함)

src/app/(app)/layout.tsx        로그인 후 화면 공통 레이아웃 — user · Drive 연결 1회 조회 → AppDataProvider → DndProvider → AppShell (25번)
src/app/(app)/page.tsx          캘린더 화면 (WeekBoard 본문만)
src/app/login/page.tsx          로그인 폼 (가입 전환 버튼은 주석 처리됨)
src/app/api/clip/route.ts       공유하기 스크랩용 API — 비밀키 헤더 인증 → Todo List에 새 항목 insert
src/app/(app)/para/page.tsx     PARA 목록 (ParaBoard 본문만)
src/app/(app)/para/[kind]/[id]/page.tsx kind 검증 후 ContainerDetailScreen 본문만
src/app/api/auth/google/route.ts        로그인 사용자를 Google 동의 화면으로 리다이렉트 (18번 결정)
src/app/api/auth/google/callback/route.ts  인가 코드를 토큰으로 교환해서 google_accounts에 저장
src/app/api/drive/folder/route.ts  컨테이너(project/area/resource) → Drive 폴더 조회, 없으면 생성 후 drive_folder_id 저장
src/app/api/drive/files/route.ts   Drive 폴더 내 파일 목록 조회 / 바이너리 파일 업로드
src/app/api/drive/notes/route.ts   마크다운 노트 파일 생성 / 내용 읽기(GET) / 내용 저장 + 리네임(PUT)
src/app/api/drive/promote/route.ts 선택한 스크랩(들)을 노트로 승격(폴더 확보 + 마크다운 생성 + 원본 스크랩 삭제, 20번 결정)
src/app/api/drive/access-token/route.ts  Google Picker용 단기 access token 발급 (24번 결정)
src/app/api/drive/import/route.ts  Picker로 고른 기존 파일을 컨테이너 폴더의 자식으로 추가 (24번 결정)
src/proxy.ts                    (구 middleware.ts) 인증 안 된 요청을 /login으로 리다이렉트 (/api/*는 제외)

src/lib/supabase/client.ts      브라우저용 Supabase 클라이언트
src/lib/supabase/server.ts      서버 컴포넌트용 Supabase 클라이언트 (로그인 세션 기반)
src/lib/supabase/admin.ts       secret 키로 RLS 우회하는 서버 전용 클라이언트 (/api/clip 전용)
src/lib/supabase/todos.ts       useSupabaseTodos 훅 — fetch + realtime 구독 + 낙관적 업데이트(add/update/remove/reorder)
src/lib/supabase/containers.ts  useSupabaseProjects/Areas/Resources 훅 — projects/areas/resources 테이블 CRUD + realtime
src/lib/types.ts                Todo/Project/Area/Resource 타입, TodoKind, ParaKind, isInboxVisible(), 요일 키, 라벨
src/lib/category.ts             getParaCategory() + 카테고리별 CSS 변수 맵 (DESIGN.md 3번 참고)
src/lib/app-data/               데이터 단일 출처: AppDataProvider, useTodos, useContainers, useTodoActions, useSession, useSignOut (25번),
                                useSubtasks(subtasksOf · progressOf) · useSubtaskActions (27번),
                                useReflections(reflectionsOf · reflectionsOfProject) · useReflectionActions (28번)
src/lib/supabase/subtasks.ts    todo_subtasks 조회 + Realtime + 낙관적 추가/수정/삭제/순서 (27번)
src/lib/supabase/reflections.ts todo_reflections 조회 + Realtime + 낙관적 추가/수정/삭제 (28번)
src/lib/reflection.ts           회고 종류별 라벨 · 아이콘 · 색 변수, 회고 노트 마크다운 만들기 (28번)
src/lib/dnd/                    DndProvider(앱에 1개), handle-drop.ts(드롭 처리 단일 구현), drop-targets.ts(드롭 data 타입),
                                collision.ts(preferSpecificTargetCollision — 보관함과 다른 드롭 영역이 겹칠 때 우선순위)
src/lib/shell-ui.tsx            셸 UI 상태(Inbox 열림 · localStorage 기억, "+"로 열고 입력창 포커스)
src/lib/inbox-groups.ts         Inbox PARA 그룹 — 묶기 · 그룹 순서 · 펼침 상태(localStorage, 기본 접힘) (42 · 45번, INBOX-GROUPS-PLAN.md)
src/lib/use-dismiss.ts          팝오버 바깥 클릭 / Esc로 닫기
src/lib/week.ts                 주차 계산(월요일 시작, ISO 주차, 오늘 여부 등)
src/lib/time.ts                 시간 캘린더 계산(시간→px 변환, 스냅, 시간 라벨 포맷, BLOCK_GAP, 끝 · 자정 넘김 · 길이 · 시간 칸 값 등)
src/lib/calendar-layout.ts      주 보기 배치 — 겹침(layoutDayBlocks) · 자정 넘는 블록 조각(daySegmentsOf) · 놓았을 때 일정(droppedSchedule) (33 · 43번)
src/lib/balance.ts              시간 균형 계산 순수 함수 — 체크한 블록 · 겹침 · 수면 · 공백 · 요일 · PARA별 · 지난주 같은 시점 (43번)
src/lib/app-data/use-balance.ts useBalance(weekStart) — 할 일 · 컨텍스트 · 지금 시각으로 매번 계산 (43번)
src/lib/context-color.ts        컨텍스트 색 8개 이름 → CSS 변수, 새 컨텍스트에 줄 색 (43번)
src/lib/app-data/use-para-color.ts  할 일 · PARA · 목표의 색 = 영역(컨텍스트) 색 — 앱 전체가 이걸로 칠함 (44번)
src/lib/use-today.ts            "오늘 날짜"를 client-only로 계산하는 훅 (SSR 시간대 버그 방지)
src/lib/utils.ts                cn() 헬퍼 (shadcn 표준)
src/lib/google-drive.ts         Google Drive API 서버 전용 래퍼 — 컨테이너별 폴더 조회/생성,
                                파일 목록/업로드, 마크다운 파일 읽기/쓰기/리네임. 모든 함수가
                                refreshToken을 인자로 받음(전역 env 참조 없음, 18번 결정) (PLANNING.md 9번)
src/lib/google-account.ts      google_accounts 조회/저장 + API route 공용 가드 requireGoogleAuth() (18번 결정)
src/lib/frontmatter.ts         노트 Properties용 YAML frontmatter 파서/직렬화기 (손으로 구현, 20번 결정)
src/lib/drive-file.ts          Drive 파일 종류 판별(md/pdf/pptx/image) + 수정일 포맷 (클라이언트에서도 씀)
src/lib/google-picker.ts       클라이언트 전용 Google Picker 헬퍼 — 기존 Drive 파일을 골라 접근 권한을 부여받음 (24번 결정)

src/components/shell/           앱 셸 — 레이아웃에서만 렌더링, 화면에서 import 금지(ESLint). app-shell / app-rail(레일 · 모바일 탭) /
                                inbox-panel(밀어내는 패널 · 바텀시트 · PARA 그룹) / account-menu / drive-status-banner (25번, DESIGN.md 5번)
src/components/week-board.tsx    캘린더 화면 본문 — URL에서 주/월 계산, 툴바 + 주/월 그리드 조립
src/components/calendar-header.tsx 캘린더 툴바 — 제목 → 미니 캘린더 팝오버, 보기 드롭다운(주/월), +, 이전/오늘/다음
src/components/week-calendar.tsx Mon~Sun 시간 단위 캘린더 그리드(요일 헤더 + 0~24시 스크롤 영역 + 현재 시각 라인)
src/components/calendar-block.tsx 캘린더에 예약된 할 일 블록(드래그로 이동, 하단 핸들로 리사이즈, PARA 카테고리 색상 코딩)
src/components/month-calendar.tsx 월 보기 그리드 (칸 클릭 → 그 주, 일정 클릭 → 상세 팝업)
src/components/mini-calendar.tsx 애플식 미니 달력 (calendar-header 팝오버 안, 보는 주 띠 강조)
src/components/todo-card.tsx    할 일/노트 한 줄(할 일=체크박스, 노트=아이콘만 + 텍스트 + 드래그 핸들 +
                                 삭제 + URL이 있으면 파비콘 임베드 카드 + 전환 버튼)
src/components/todo-detail-modal.tsx  할 일/노트 상세 팝업 (제목/메모 수정, 할일↔노트 전환, 삭제, 완료 체크, 탭: 하위 할 일 · 메모·URL · 사진, `initialTab`, 빈 메모 회고 유도) — body 포털
src/components/subtask/subtask-list.tsx      하위 할 일 체크리스트(수정 · 삭제 · 연속 추가 · 드래그 순서) + DragOverlay 미리보기 (27번)
src/components/subtask/subtask-progress.tsx  하위 할 일 진행률 링 + done/total (27번)
src/components/subtask/moved-todo-list.tsx   원래 할 일의 "나중에로 옮긴 할 일" 목록(역링크) (41번)
src/components/para/open-marks-card.tsx            PARA 개요 "남은 것" — 열린 확인 · 질문 모아보기 (39번)
src/components/search/mark-chips.tsx              확인할 것 · 질문 칩 + 끝난 것도 보기 스위치 — 검색 패널 · 남은 것 카드 (39번)
src/components/retro/retro-kind.tsx               회고 종류 아이콘(메모 줄 표시 칸) + 종류 드롭다운 (38번)
src/components/retro/project-retro-tab.tsx        PARA 상세(Project) 회고 탭 — 메모 `[p] [c] [I]` 줄 3열, 프로젝트 전체 회고(노트), 할 일로, 회고 노트로 저장 (38번)
src/lib/retro.ts                                  회고 = 메모 줄 — 모으기 · 회고 노트 찾기 · 줄 붙이기 · 할 일로 표시 · 마크다운 (38번)
src/components/memo/memo-editor.tsx               메모 원문 편집 — 줄 표시 툴바 + 입력칸, Enter 이어 쓰기 (36번)
src/components/memo/memo-toolbar.tsx              줄 표시 버튼 5개 (36번)
src/components/memo/memo-view.tsx                 메모 보기 모드 — 표시 아이콘 · 체크 · 질문 해결 입력칸 (36번)
src/components/memo/mark-meta.ts                  표시 종류별 라벨 · 아이콘 · 색
src/lib/memo-marks.ts                             메모 줄 표시 인식 · 고치기 순수 함수 (36번)
src/components/memo/memo-link.tsx                 메모 링크 `[[이름(10/1)]]` 그리기 — 링크 · 끊긴 링크 · 예전 "…에서 옮김" 줄 (41번)
src/lib/memo-links.ts                             메모 링크 찾기 · 나누기 · 역링크 · 이름 바뀔 때 고치기 순수 함수 (41번)
src/lib/search.ts                                 키워드 검색 순수 함수 — 검색어 다듬기 · 색인 · 점수 · 줄 모드 · 메모 스니펫 · 강조 위치 (37번)
src/lib/app-data/use-search.ts                    검색 색인(useMemo) + 검색어 · 칩 useDeferredValue (37번)
src/components/shell/search-panel.tsx             검색 패널 — ⌘K · 칩 · 결과 목록 · 키보드 · 결과 열기 (37번)
src/components/search/search-result.tsx           결과 카드(할 일 · PARA) · 이모지 줄 · 줄 표시 줄(체크 · 해결) · HighlightText (37번)
src/components/todo-detail-by-id.tsx              id로 할 일 상세 팝업 열기(initialTab) — 검색 · 프로젝트 회고 탭이 같이 씀 (37번)
scripts/check-search.ts                           검색 기준 케이스 확인 스크립트 (`npx tsx scripts/check-search.ts`)
scripts/check-overnight.ts                        자정 넘는 블록 · 시간 편집 · 넘기기 시점 확인 (43번)
scripts/check-balance.ts                          시간 균형 계산 확인 (43번)
src/components/goals/balance-section.tsx          목표 화면 시간 균형 — BalanceSection(훅) + BalanceView(그리기) (43번)
src/components/todo-time-editor.tsx               상세 팝업 시작 · 끝 시간 편집 (43번)
src/components/add-todo-form.tsx  할 일/노트 추가 입력 행 (토글로 종류 선택)
src/components/para-board.tsx   PARA 목록 화면 본문 — 세그먼트 컨트롤 + 컨테이너 카드 그리드
src/components/para/container-card.tsx        Project/Area/Resource 카드 (droppable, 클릭 시 상세로 이동)
src/components/para/add-container-form.tsx    Project/Area/Resource 생성 입력 행 (Notes 탭의 "새 노트 추가"에도 재사용)
src/components/para/add-mapped-todo-row.tsx   PARA 상세 할 일 목록 맨 위 "새 할 일" 입력 줄 (31번)
src/components/para/container-menu.tsx        PARA 상세 이름 옆 ··· 메뉴 (이름 바꾸기 · 상태 · 삭제) (31번)
src/components/para/delete-container-dialog.tsx  PARA 삭제 확인 창 — 함께 삭제(기본) / 연결만 끊기, body 포털 (31번)
src/lib/app-data/container-actions.ts         PARA 삭제의 단일 구현 — Drive 휴지통 → 할 일 → 컨테이너 순서 (31번)
src/components/para/container-detail-screen.tsx  상세 화면 (헤더 + 요약 줄 + Overview/Tasks/자료 탭, 20번 결정)
src/components/para/scrap-section.tsx         Tasks 탭 안 "스크랩" 섹션 — 선택 모드 + 노트 승격 버튼 (20번 결정)
src/components/para/files-tab.tsx             자료 탭 — 파일 목록/업로드/새 노트 + 인앱 마크다운 에디터(Properties 포함) (20번 결정)
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
   **2026-09-28부터 schema.sql은 더 늘리지 않는다**(SQL Editor가 약 249줄까지만 붙여넣기됨). 이후 DB 변경은
   `supabase/migrations/YYYYMMDD_이름.sql`로 따로 만들고, 기존 프로젝트는 **그 파일만** 실행. **실행이 끝나면 `migrations/applied/`로 옮긴다**
   (2026-10-01 사용자 요청 — `migrations/` 맨 위에 남은 파일 = 아직 실행할 것). 지우지 않는 이유: 새 프로젝트를 만들 때 필요하다.
   새 프로젝트는 schema.sql → `migrations/applied/` → `migrations/` 파일을 날짜순으로 실행
   (`todo_reflections`는 만들었다가 `drop_todo_reflections`로 지운 것이라 새 프로젝트에선 둘 다 건너뛰어도 된다).
   아래는 모두 실행 완료 → `applied/`로 옮김(2026-10-01):
   - `20260928_todo_subtasks.sql` — 하위 할 일 테이블 (SUBTASKS-PLAN.md 1단계) 실행 완료
   - `20260928_webapp_push.sql` — 컨텍스트 · 웹 푸시 테이블 (WEBAPP-PLAN.md 3단계) 실행 완료(목록에 "실행 필요"로 남아 있었지만, 이 테이블을 바꾸는 `20261001_context_balance.sql`이 실행됐으므로 실행된 것)
   - `20260928_todo_reflections.sql` — 회고 테이블 (REFLECTIONS-PLAN.md) 실행 완료
   - `20260929_subtask_carried_at.sql` — 하위 할 일 넘김 (CARRY-OVER-PLAN.md) 실행 완료
   - `20260929_weekly_goals.sql` — 주간 목표 테이블 + `todos.goal_id` (GOALS-PLAN.md) 실행 완료
   - `20260929_todo_photos.sql` — 할 일 사진 테이블 (PHOTOS-PLAN.md) 실행 완료
   - `20260930_drop_todo_reflections.sql` — 회고 테이블 삭제 (38번) 실행 완료
   - `20261001_context_balance.sql` — 컨텍스트 색 · 수면으로 세기 (BALANCE-PLAN.md 2단계, 43번) 실행 완료
7. `/api/clip` 기능을 실제로 쓰려면 `SUPABASE_SECRET_KEY`/`CLIP_API_SECRET`/`CLIP_USER_ID` 세
   환경변수를 로컬(`.env.local`)과 Vercel 양쪽에 아직 등록 안 함 — README의 해당 섹션 참고해서
   설정하고 애플 단축어까지 만들어야 실제로 동작함. 코드/스키마는 준비 완료 상태.
8. 가입 버튼을 코드에서만 주석 처리했음 — 완전히 막으려면 Supabase 대시보드
   Authentication → Sign In / Providers → Email에서 "Allow new users to sign up"을 꺼야 함(아직 안 함).
9. **(2026-09-14 갱신) PARA 기능 — 사용자가 실제 Supabase 프로젝트에서 테스트해서 드래그 버그
   발견 → 12번 결정으로 수정 완료.** 13번 결정(할 일/노트 구분)까지 반영했으니, `supabase/schema.sql`을
   다시 한 번 실행(`todos.kind` 컬럼 + `projects`/`areas`/`resources`의 `notes` 컬럼 제거)해야
   최신 상태로 동작함. Project/Area/Resource **이름 수정 UI**(지금은 생성만 가능), 완료·보관 항목을
   목록에서 접거나 필터링하는 기능은 여전히 다음 할 일로 남아있음.
10. **(2026-09-18 갱신, 20번 결정 반영) Google Drive 노트/자료 연동 — 코드 반영 완료, 실사용 테스트 남음**:
    OAuth 연결 + 폴더 lazy 생성 + 파일 목록/업로드/노트 편집 + 스크랩 승격까지 전부 코드로 반영됨
    (20번 결정). 남은 건 실제 브라우저에서 본인 Google 계정으로 자료 탭 열기 → 업로드 → 새 노트
    작성/저장 → 스크랩 여러 개 선택해서 승격까지 한 바퀴 실사용 테스트뿐. 이후 다음 후보:
    (a) PLANNING.md 9.8에 남은 캐싱/업로드 제한/보관 폴더 열린 질문들; (b) 노트 편집기에
    마크다운 미리보기/문법 하이라이팅 추가할지; (c) 링크형 속성 값을 에디터에서 직접 수정/삭제하는
    UI(지금은 승격 시 자동으로만 채워지고 읽기 전용, 시안 그대로).
11. **(2026-09-30) 검색 · 메모 줄 표시 다음 할 일** (37번 사용 방식 변화 검토 결과):
    - ~~회고 탭 정리(MEMO-MARKS-PLAN.md 2단계)~~ — **완료(38번)**, 회고 테이블 삭제 SQL도 실행 완료.
    - 실제 데이터에서 SEARCH-PLAN.md 기준 케이스 3개가 1등인지, 모바일에서 입력이 버벅이지 않는지 확인(SEARCH-PLAN.md 6번).
    - ~~(선택) 메모 탭에 열린 `[?]` · `[ ]` 개수~~ — **완료(40번)**. 주 보기 블록에 표시하는 건 아직(시안 먼저).
    - (선택) 검색 도움말의 📝 예시를 `[i]`(알게 된 것) 검색으로 바꾸기, `알게 된 것` 칩. 메모 탭 안 `[i]` 답 색(지금 회색, 시안대로).
12. **(2026-10-01) 시간 균형 다음 할 일** (43번, BALANCE-PLAN.md):
    - 사용자 설정(BALANCE-PLAN.md 7번): 회사 → 업무 · 개인 → 기타 이름 바꾸기, 건강 `health` · 지적 `knowledge` · 관계 `relationship` · 수면 `sleep` 추가 +
      수면으로 세기, PARA마다 컨텍스트 고르기(내집마련 → 생활), 수면 블록 일주일치, 단축어 꺼질 때 `all`. 생활 `life`는 추가 완료.
    - 실제 데이터 확인: 목표 화면 숫자, 자정 넘는 수면 블록이 요일별로 나뉘는지, 아침에 다음 날 조각 손잡이 · 팝업으로 기상 시간 고치기가 편한지,
      배포 후 캘린더 · Inbox · PARA가 영역 색으로 보이는지(44번 — 내집마련 일정 = 청록).
    - 몇 주 써 본 뒤 후보(BALANCE-PLAN.md 10번): ~~캘린더 블록 · PARA 색 = 컨텍스트 색~~(44번 완료), 영역별 주간 목표 시간(`GoalRing`), 반복 할 일(수면 블록),
      공백 나누기, 다섯 번째 영역 "마음". 다크 모드를 켤 때는 `--category-area` · `--ctx-orange` 다크 값이 차트 밝기 기준을 넘는다(dataviz 검증기) — 그때 다시 보기.

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

1. 이 문서 + PLANNING.md + README.md를 먼저 읽기. **화면/컴포넌트를 만들거나 고치는 작업이면
   [DESIGN.md](./DESIGN.md)도 반드시 같이 읽기** — 컬러 토큰, radius, 레이아웃 규칙이 정리돼 있고
   `CLAUDE.md`에서 자동으로 불러오도록 걸어뒀습니다.
2. `git log --oneline`으로 커밋 히스토리 훑어보면 각 변경의 이유가 커밋 메시지에 꽤 자세히 적혀 있음.
3. Supabase 설정부터 진행(README 참고)한 뒤, `npm run dev`로 실제 로그인부터 테스트.
4. 이후 요청은 위 "아직 안 끝난 것" 목록 중 하나부터 진행하면 자연스럽게 이어집니다.

## 가짜 Supabase로 실제 앱 띄우기 (화면 확인용, 커밋 안 함)

이 클라우드 세션엔 Supabase 키가 없어서 로그인이 필요한 화면은 그냥은 못 본다. 매번 다시 만들던 방법을 적어 둔다(44번에서 씀).
1. **목 서버**(파이썬 `http.server`, 예: 127.0.0.1:54329) — `GET /auth/v1/user` → 사용자 JSON, `GET /rest/v1/<테이블>` → 행 배열 +
   `content-range: 0-N/N` 헤더(`fetchAllRows`가 개수를 읽음), `Accept`에 `vnd.pgrst.object`가 있으면 행 하나(`user_context` 등), POST · PATCH · DELETE는 그냥 성공.
   행 모양은 `src/lib/supabase/*.ts`의 `fromRow`(snake_case). 테이블: todos · todo_subtasks · todo_photos · projects · areas · resources · contexts · user_context ·
   weekly_goals · google_accounts. Realtime 웹소켓은 없어도 화면은 뜬다.
2. `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=x npx next dev -p 3125`
3. Playwright(스크래치 폴더에 `npm i playwright`, 브라우저는 `/opt/pw-browsers/chromium`) — 쿠키 `sb-127-auth-token`(호스트 첫 마디가 `127`) =
   `"base64-" + base64url(JSON 세션)`, 세션의 `access_token`은 JWT 모양(헤더.페이로드.sig, exp 먼 미래), `expires_at`도 먼 미래.
   "지금"을 고정하려면 `addInitScript`로 `Date`를 바꾼다(시간 균형 · 현재 시각 선). 폰트 CDN은 막혀 기본 글꼴로 보인다.
4. 끝나면 `.next/dev`를 지운다 — 지운 임시 페이지의 타입이 남아 tsc가 실패한 적이 있다.


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
- 데스크톱: 왼쪽 고정 사이드바(`AppSidebar`)에 브랜드/빠른 추가/미니 캘린더/보관함(항상 펼침)/
  캘린더·PARA 전환/계정. 모바일: 하단 탭바(`IconRail`, Todo/캘린더/PARA) + "Todo" 탭으로 여는
  보관함 바텀시트 (14번 결정 참고)
- 모바일: iOS 캘린더 느낌의 요일+날짜 원형 스트립으로 하루씩 보기
- 로그인(이메일·비밀번호), 로그아웃 — 가입 버튼은 개인용이라 주석 처리해둠
- Supabase 실시간 동기화 (다른 기기/탭에서 바뀐 내용 자동 반영)
- 공유하기 → 애플 단축어로 링크 스크랩 (`/api/clip`) — Todo List에 제목 + URL 임베드 카드로 추가
- 디자인: 미니멀 캘린더형(Notion Calendar/Google Calendar 참고), 웜 크림 배경 + 블루그레이
  프라이머리 팔레트는 유지, PARA 매핑에 따른 카테고리 색상 코딩 (14번 결정, [DESIGN.md](./DESIGN.md) 참고)
- PARA(Project/Area/Resource, `/para`) — 할 일/노트를 요일/시간과는 독립적으로 프로젝트·영역·리소스
  중 하나에 드래그로 매핑. 상세 화면(`/para/[kind]/[id]`)에 Overview/Tasks/Notes 탭 (8번 결정 참고).
  목록 화면은 가로 세그먼트 컨트롤 + 카드 그리드, 상세 화면은 캘린더 화면과 `AppSidebar`를 공유
  (12번, 14번 결정 참고)

## 파일 맵

```
PLANNING.md                    기획서 (컨셉/데이터 모델/스택 결정 근거)
README.md                      실행 방법 + Supabase 설정 단계별 가이드
HANDOFF.md                     이 문서
DESIGN.md                      디자인 가이드 — 컬러 토큰/radius/레이아웃 규칙/새 화면 체크리스트 (14번 결정)

supabase/schema.sql            todos + projects/areas/resources 테이블 + RLS 정책 + realtime publication (Supabase SQL Editor에서 1회 실행,
                                재실행해도 안전)
.env.local.example             필요한 환경변수 템플릿 (진짜 키는 절대 커밋 안 함)

src/app/page.tsx                서버 컴포넌트: 로그인 체크 후 WeekBoard 렌더 (userId/userEmail 전달)
src/app/login/page.tsx          로그인 폼 (가입 전환 버튼은 주석 처리됨)
src/app/api/clip/route.ts       공유하기 스크랩용 API — 비밀키 헤더 인증 → Todo List에 새 항목 insert
src/app/para/page.tsx           서버 컴포넌트: 로그인 체크 후 ParaBoard 렌더
src/app/para/[kind]/[id]/page.tsx 서버 컴포넌트: kind 검증 + 로그인 체크 후 ContainerDetailScreen 렌더
src/proxy.ts                    (구 middleware.ts) 인증 안 된 요청을 /login으로 리다이렉트 (/api/*는 제외)

src/lib/supabase/client.ts      브라우저용 Supabase 클라이언트
src/lib/supabase/server.ts      서버 컴포넌트용 Supabase 클라이언트 (로그인 세션 기반)
src/lib/supabase/admin.ts       secret 키로 RLS 우회하는 서버 전용 클라이언트 (/api/clip 전용)
src/lib/supabase/todos.ts       useSupabaseTodos 훅 — fetch + realtime 구독 + 낙관적 업데이트(add/update/remove/reorder)
src/lib/supabase/containers.ts  useSupabaseProjects/Areas/Resources 훅 — projects/areas/resources 테이블 CRUD + realtime
src/lib/types.ts                Todo/Project/Area/Resource 타입, TodoKind, ParaKind, isInboxVisible(), 요일 키, 라벨
src/lib/category.ts             getParaCategory() + 카테고리별 CSS 변수 맵 (DESIGN.md 3번 참고)
src/lib/dnd.ts                  preferSpecificTargetCollision — 보관함 패널과 다른 드롭 영역이 겹칠 때 충돌 우선순위
src/lib/week.ts                 주차 계산(월요일 시작, ISO 주차, 오늘 여부 등)
src/lib/time.ts                 시간 캘린더 계산(시간→px 변환, 스냅, 시간 라벨 포맷, BLOCK_GAP 등)
src/lib/use-today.ts            "오늘 날짜"를 client-only로 계산하는 훅 (SSR 시간대 버그 방지)
src/lib/utils.ts                cn() 헬퍼 (shadcn 표준)

src/components/week-board.tsx    메인 화면 전체 — 상태 관리, DnD 컨텍스트, 레이아웃 조립
src/components/week-nav.tsx      주차 이동 버튼들
src/components/week-calendar.tsx Mon~Sun 시간 단위 캘린더 그리드(요일 헤더 + 0~24시 스크롤 영역 + 현재 시각 라인)
src/components/calendar-block.tsx 캘린더에 예약된 할 일 블록(드래그로 이동, 하단 핸들로 리사이즈, PARA 카테고리 색상 코딩)
src/components/app-sidebar.tsx  데스크톱 사이드바 겸 모바일 보관함 바텀시트 (구 todo-panel.tsx 대체, DESIGN.md 5번 참고).
                                 단일 컴포넌트를 sm: 반응형 클래스로만 전환 — JS 미디어쿼리 훅 없음
src/components/mini-calendar.tsx 사이드바용 월 그리드 위젯 (오늘/이번 주 강조, 날짜 클릭 이동)
src/components/icon-rail.tsx    모바일 전용 하단 탭바 저수준 컴포넌트 (items 배열 받아서 렌더만 함)
src/components/app-nav-rail.tsx 캘린더/PARA 화면이 공유하는 하단 탭바 (Todo List·PARA·캘린더 3개 고정 항목,
                                 데스크톱 내비게이션은 AppSidebar가 맡음)
src/components/todo-card.tsx    할 일/노트 한 줄(할 일=체크박스, 노트=아이콘만 + 텍스트 + 드래그 핸들 +
                                 삭제 + URL이 있으면 파비콘 임베드 카드 + 전환 버튼)
src/components/todo-detail-modal.tsx  할 일/노트 상세 팝업 (제목/메모 수정, 할일↔노트 전환, 삭제)
src/components/add-todo-form.tsx  할 일/노트 추가 입력 행 (토글로 종류 선택)
src/components/para-board.tsx   PARA 목록 화면 — 가로 세그먼트 컨트롤 + 컨테이너 카드 그리드 + 재사용된 AppSidebar
src/components/para/container-card.tsx        Project/Area/Resource 카드 (droppable, 클릭 시 상세로 이동)
src/components/para/add-container-form.tsx    Project/Area/Resource 생성 입력 행 (Notes 탭의 "새 노트 추가"에도 재사용)
src/components/para/container-detail-screen.tsx  상세 화면 (헤더 + 요약 줄 + Overview/Tasks/Notes 탭)
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
9. **(2026-09-14 갱신) PARA 기능 — 사용자가 실제 Supabase 프로젝트에서 테스트해서 드래그 버그
   발견 → 12번 결정으로 수정 완료.** 13번 결정(할 일/노트 구분)까지 반영했으니, `supabase/schema.sql`을
   다시 한 번 실행(`todos.kind` 컬럼 + `projects`/`areas`/`resources`의 `notes` 컬럼 제거)해야
   최신 상태로 동작함. Project/Area/Resource **이름 수정 UI**(지금은 생성만 가능), 완료·보관 항목을
   목록에서 접거나 필터링하는 기능은 여전히 다음 할 일로 남아있음.

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

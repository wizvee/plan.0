# 작업 인계 노트 (HANDOFF)

새 세션(로컬 Claude Code 등)에서 이 프로젝트를 이어받을 때 읽는 문서입니다.
"기획서"는 [PLANNING.md](./PLANNING.md), "설정/실행 방법"은 [README.md](./README.md)에 있고,
이 문서는 **그 사이의 맥락 — 왜 지금 이 모습이 됐는지, 무엇이 아직 안 끝났는지**를 정리합니다.

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

## 지금 구현된 것 (기능 목록)

- Todo List(전역 보관함, 사이드 패널) + Mon~Sun 한 줄 그리드
- 할 일 추가 / 클릭해서 수정 / 삭제 / 완료 체크(원형 체크박스, Reminders 스타일)
- 드래그 앤 드롭: 요일 간 이동, 같은 칸 내 순서 변경, 패널 ↔ 요일 칸 이동 ([`@dnd-kit`](https://dndkit.com/))
- 주차 이동 (`< 37주 >`, "이번 주" 바로가기, 오늘 날짜가 포함된 요일 칸에 파란 테두리 + "오늘" 배지)
- 오른쪽 고정 아이콘 레일 + 체크 아이콘으로 여는 Todo List 슬라이드 패널 (Google Calendar 참고)
- 모바일: 요일 탭으로 하나씩 보기, 패널은 거의 전체 화면 슬라이드오버
- 로그인/가입(이메일·비밀번호), 로그아웃
- Supabase 실시간 동기화 (다른 기기/탭에서 바뀐 내용 자동 반영)
- 디자인: Apple 미리알림 스타일 (iOS 그룹 카드, 블루 단일 accent, 시스템 폰트)

## 파일 맵

```
PLANNING.md                    기획서 (컨셉/데이터 모델/스택 결정 근거)
README.md                      실행 방법 + Supabase 설정 단계별 가이드
HANDOFF.md                     이 문서

supabase/schema.sql            todos 테이블 + RLS 정책 + realtime publication (Supabase SQL Editor에서 1회 실행)
.env.local.example             필요한 환경변수 템플릿 (진짜 키는 절대 커밋 안 함)

src/app/page.tsx                서버 컴포넌트: 로그인 체크 후 WeekBoard 렌더 (userId/userEmail 전달)
src/app/login/page.tsx          로그인/가입 폼
src/proxy.ts                    (구 middleware.ts) 인증 안 된 요청을 /login으로 리다이렉트

src/lib/supabase/client.ts      브라우저용 Supabase 클라이언트
src/lib/supabase/server.ts      서버 컴포넌트용 Supabase 클라이언트
src/lib/supabase/todos.ts       useSupabaseTodos 훅 — fetch + realtime 구독 + 낙관적 업데이트(add/update/remove/reorder)
src/lib/types.ts                Todo 타입, 요일 키, 라벨
src/lib/week.ts                 주차 계산(월요일 시작, ISO 주차, 오늘 여부 등)
src/lib/utils.ts                cn() 헬퍼 (shadcn 표준)

src/components/week-board.tsx   메인 화면 전체 — 상태 관리, DnD 컨텍스트, 레이아웃 조립
src/components/week-nav.tsx     주차 이동 버튼들
src/components/todo-column.tsx  요일 1칸 (iOS 그룹 카드 스타일)
src/components/todo-panel.tsx   Todo List 슬라이드 패널 (자체 헤더 + 닫기 버튼)
src/components/icon-rail.tsx    오른쪽 고정 아이콘 레일 (확장 가능한 구조)
src/components/todo-card.tsx    할 일 한 줄(체크박스 + 텍스트 + 드래그 핸들 + 삭제)
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
3. PLANNING.md의 "향후 확장 아이디어"(6번 항목, 지금은 범위 밖): 시간 단위 입력/표시,
   카테고리·우선순위 색상 태그(요일별 색상 자리를 이걸 위해 비워둠), 월간/분기 플래너 탭.
4. 아이콘 레일은 체크 아이콘 하나뿐이라, 나중에 다른 메뉴(설정 등) 추가하기 쉽게 배열 구조로 만들어둠
   (`icon-rail.tsx`의 `items` prop).

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

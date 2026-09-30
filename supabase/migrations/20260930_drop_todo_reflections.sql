-- 회고 테이블 삭제 (MEMO-MARKS-PLAN.md 7번 · HANDOFF.md 38번, 2026-09-30)
-- 회고는 이제 할 일 메모의 줄 표시(`- [p]` 잘한 점 · `- [c]` 아쉬운 점 · `- [I]` 다음엔)로 적는다.
-- 사용자가 기존 회고를 모두 메모로 옮겨 이 테이블은 비어 있다. 앱 코드는 더 이상 이 테이블을 읽지 않는다.
--
-- 실행 순서: 새 코드가 배포된 뒤(Vercel) Supabase SQL Editor에서 실행. 먼저 실행하면 옛 화면이 회고를 못 읽어 오류가 난다.
-- 테이블을 지우면 Realtime publication · RLS 정책 · 인덱스도 같이 사라진다.

drop table if exists public.todo_reflections;

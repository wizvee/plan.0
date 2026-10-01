-- 2026-09-29 · 하위 할 일 "넘김" — CARRY-OVER-PLAN.md
-- Supabase SQL Editor에서 이 파일만 한 번 실행하면 된다(재실행해도 안전).
-- 그날 못 끝낸 하위 할 일을 다음 평일로 넘기면, 원래 항목은 지우지 않고 넘긴 시각만 남긴다
-- (그날 못 했다는 기록). 다음 날 쪽에는 같은 내용의 새 행이 생긴다. null = 넘기지 않음.

alter table public.todo_subtasks add column if not exists carried_at timestamptz;

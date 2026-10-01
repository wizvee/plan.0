-- 2026-09-28 · 회고(잘한 점 · 아쉬운 점 · 다음엔) 테이블 — REFLECTIONS-PLAN.md 3번
-- Supabase SQL Editor에서 이 파일만 한 번 실행하면 된다(재실행해도 안전).
-- 회고 한 줄은 할 일(todo_id)에 붙거나 프로젝트에 직접(project_id) 붙는다 — 정확히 하나.
-- 할 일에 붙은 회고는 project_id를 저장하지 않는다: 소속은 항상 할 일의 현재 매핑에서 계산(할 일을 옮기면 따라감).
-- 할 일을 지우면 그 회고도, 프로젝트를 지우면 프로젝트에 직접 쓴 회고도 함께 지워진다.

create table if not exists public.todo_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid references public.todos (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null check (kind in ('keep', 'problem', 'try')),
  content text not null check (length(btrim(content)) > 0),
  -- "다음엔" 항목을 할 일로 만들었을 때 만든 할 일. 그 할 일을 지우면 다시 비워진다.
  converted_todo_id uuid references public.todos (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint todo_reflections_one_owner check (num_nonnulls(todo_id, project_id) = 1)
);

create index if not exists todo_reflections_todo_id_idx on public.todo_reflections (todo_id);
create index if not exists todo_reflections_project_id_idx on public.todo_reflections (project_id);
create index if not exists todo_reflections_user_id_idx on public.todo_reflections (user_id);

alter table public.todo_reflections enable row level security;

-- insert/update는 붙는 대상(할 일 · 프로젝트 · 만든 할 일)도 내 것인지 확인한다 — 남의 id로 끼워 넣지 못하게.
drop policy if exists "Users can view their own reflections" on public.todo_reflections;
create policy "Users can view their own reflections"
  on public.todo_reflections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reflections" on public.todo_reflections;
create policy "Users can insert their own reflections"
  on public.todo_reflections for insert
  with check (
    auth.uid() = user_id
    and (todo_id is null or exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid()))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
    and (converted_todo_id is null or exists (select 1 from public.todos t where t.id = converted_todo_id and t.user_id = auth.uid()))
  );

drop policy if exists "Users can update their own reflections" on public.todo_reflections;
create policy "Users can update their own reflections"
  on public.todo_reflections for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (todo_id is null or exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid()))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
    and (converted_todo_id is null or exists (select 1 from public.todos t where t.id = converted_todo_id and t.user_id = auth.uid()))
  );

drop policy if exists "Users can delete their own reflections" on public.todo_reflections;
create policy "Users can delete their own reflections"
  on public.todo_reflections for delete
  using (auth.uid() = user_id);

-- 실시간 동기화 대상에 추가 (ALTER PUBLICATION ... ADD TABLE엔 IF NOT EXISTS가 없어서 가드).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todo_reflections'
  ) then
    alter publication supabase_realtime add table public.todo_reflections;
  end if;
end $$;

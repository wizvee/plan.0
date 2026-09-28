-- 2026-09-28 · 하위 할 일(서브 할 일) 테이블 — SUBTASKS-PLAN.md 1단계
-- Supabase SQL Editor에서 이 파일만 한 번 실행하면 된다(재실행해도 안전).
-- 할 일 하나 아래의 체크리스트(한 단계만). 체크 하나가 다른 기기의 체크를 덮어쓰지 않도록
-- todos의 jsonb 컬럼이 아니라 행 단위 테이블로 둔다. 부모 할 일을 지우면 함께 지워진다.

create table if not exists public.todo_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid not null references public.todos (id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  completed boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists todo_subtasks_todo_id_idx on public.todo_subtasks (todo_id);
create index if not exists todo_subtasks_user_id_idx on public.todo_subtasks (user_id);

alter table public.todo_subtasks enable row level security;

-- insert/update는 부모 할 일도 내 것인지 확인한다 — 남의 할 일 id로 하위 할 일을 끼워 넣지 못하게.
drop policy if exists "Users can view their own subtasks" on public.todo_subtasks;
create policy "Users can view their own subtasks"
  on public.todo_subtasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own subtasks" on public.todo_subtasks;
create policy "Users can insert their own subtasks"
  on public.todo_subtasks for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid())
  );

drop policy if exists "Users can update their own subtasks" on public.todo_subtasks;
create policy "Users can update their own subtasks"
  on public.todo_subtasks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid())
  );

drop policy if exists "Users can delete their own subtasks" on public.todo_subtasks;
create policy "Users can delete their own subtasks"
  on public.todo_subtasks for delete
  using (auth.uid() = user_id);

-- 실시간 동기화 대상에 추가 (ALTER PUBLICATION ... ADD TABLE엔 IF NOT EXISTS가 없어서 가드).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todo_subtasks'
  ) then
    alter publication supabase_realtime add table public.todo_subtasks;
  end if;
end $$;

-- 2026-09-29 · 할 일 사진 — PHOTOS-PLAN.md 2 · 3번
-- Supabase SQL Editor에서 이 파일만 한 번 실행하면 된다(재실행해도 안전).
-- 사진 파일은 사용자 Google Drive에 있고, 여기엔 Drive 파일 id(원본 · 썸네일) · 폴더 id · 대표 여부만 둔다.
-- 할 일을 지우면 행은 같이 지워지지만 Drive 사진은 남는다(기록이라 실수로 날리지 않게).

create table if not exists public.todo_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid not null references public.todos (id) on delete cascade,
  drive_file_id text not null,
  drive_thumb_id text not null,
  drive_folder_id text not null,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists todo_photos_todo_id_idx on public.todo_photos (todo_id);
create index if not exists todo_photos_user_id_idx on public.todo_photos (user_id);
-- 할 일당 대표 사진은 하나 — 바꿀 때는 기존 대표를 먼저 끈다
create unique index if not exists todo_photos_one_cover_idx on public.todo_photos (todo_id) where is_cover;

alter table public.todo_photos enable row level security;

drop policy if exists "Users can view their own photos" on public.todo_photos;
create policy "Users can view their own photos"
  on public.todo_photos for select
  using (auth.uid() = user_id);

-- insert/update는 붙는 할 일도 내 것인지 확인한다 — 남의 할 일 id로 끼워 넣지 못하게.
drop policy if exists "Users can insert their own photos" on public.todo_photos;
create policy "Users can insert their own photos"
  on public.todo_photos for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid())
  );

drop policy if exists "Users can update their own photos" on public.todo_photos;
create policy "Users can update their own photos"
  on public.todo_photos for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid())
  );

drop policy if exists "Users can delete their own photos" on public.todo_photos;
create policy "Users can delete their own photos"
  on public.todo_photos for delete
  using (auth.uid() = user_id);

-- 실시간 동기화 대상에 추가 (ALTER PUBLICATION ... ADD TABLE엔 IF NOT EXISTS가 없어서 가드).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todo_photos'
  ) then
    alter publication supabase_realtime add table public.todo_photos;
  end if;
end $$;

-- Metric Swim Workout Library - Supabase schema
-- Run this in Supabase Dashboard > SQL Editor.

create table if not exists public.user_workout_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  library jsonb not null default '[]'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_workout_libraries enable row level security;

-- Re-runnable policy setup
drop policy if exists "Users can read their own swim library" on public.user_workout_libraries;
drop policy if exists "Users can insert their own swim library" on public.user_workout_libraries;
drop policy if exists "Users can update their own swim library" on public.user_workout_libraries;
drop policy if exists "Users can delete their own swim library" on public.user_workout_libraries;

create policy "Users can read their own swim library"
on public.user_workout_libraries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own swim library"
on public.user_workout_libraries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own swim library"
on public.user_workout_libraries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own swim library"
on public.user_workout_libraries
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists user_workout_libraries_updated_idx
on public.user_workout_libraries(updated_at desc);

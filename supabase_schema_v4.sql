-- Metric Swim Workout Library - V4 scalable schema
create table if not exists public.workouts_v4 (
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  title text not null,
  file_name text,
  workout_date date,
  distance_25m integer,
  distance_50m integer,
  focus text[] not null default '{}',
  search_text text not null default '',
  workout jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, workout_id)
);
create table if not exists public.user_profiles_v4 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.workouts_v4 enable row level security;
alter table public.user_profiles_v4 enable row level security;
drop policy if exists "Users can read their own workouts v4" on public.workouts_v4;
drop policy if exists "Users can insert their own workouts v4" on public.workouts_v4;
drop policy if exists "Users can update their own workouts v4" on public.workouts_v4;
drop policy if exists "Users can delete their own workouts v4" on public.workouts_v4;
create policy "Users can read their own workouts v4" on public.workouts_v4 for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert their own workouts v4" on public.workouts_v4 for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own workouts v4" on public.workouts_v4 for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own workouts v4" on public.workouts_v4 for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can read their own profile v4" on public.user_profiles_v4;
drop policy if exists "Users can insert their own profile v4" on public.user_profiles_v4;
drop policy if exists "Users can update their own profile v4" on public.user_profiles_v4;
drop policy if exists "Users can delete their own profile v4" on public.user_profiles_v4;
create policy "Users can read their own profile v4" on public.user_profiles_v4 for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert their own profile v4" on public.user_profiles_v4 for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own profile v4" on public.user_profiles_v4 for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own profile v4" on public.user_profiles_v4 for delete to authenticated using (auth.uid() = user_id);
create index if not exists workouts_v4_user_title_idx on public.workouts_v4(user_id, title);
create index if not exists workouts_v4_user_distance25_idx on public.workouts_v4(user_id, distance_25m);
create index if not exists workouts_v4_user_distance50_idx on public.workouts_v4(user_id, distance_50m);
create index if not exists workouts_v4_search_idx on public.workouts_v4 using gin(to_tsvector('english', search_text));
create index if not exists workouts_v4_focus_idx on public.workouts_v4 using gin(focus);

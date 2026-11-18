create table if not exists public.station_graders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  station_id text not null,
  grader_name text not null,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists station_graders_station_idx on public.station_graders (station_id, last_seen_at desc);

alter table public.station_graders enable row level security;

create policy "station graders insert own" on public.station_graders
  for insert to authenticated with check (user_id = auth.uid());

create policy "station graders update own" on public.station_graders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "station graders read own or admin" on public.station_graders
  for select to authenticated using (
    user_id = auth.uid() or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

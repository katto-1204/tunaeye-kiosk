-- Append-only station audit log synced from kiosk devices when online.
create table if not exists public.audit_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  station_id text not null,
  actor text not null,
  action text not null,
  detail text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_station_occurred_idx on public.audit_logs (station_id, occurred_at desc);

alter table public.audit_logs enable row level security;

create policy "audit logs insert own" on public.audit_logs
  for insert to authenticated with check (user_id = auth.uid());

create policy "audit logs read own or admin" on public.audit_logs
  for select to authenticated using (
    user_id = auth.uid() or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

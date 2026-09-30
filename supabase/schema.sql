-- Daymark sync schema. Run once in the Supabase SQL Editor.
-- Every synced entity (list, project, task, time block, routine, preference) is one row.
-- The client merges rows by (kind, id); the newest client_updated_at wins.

create table if not exists public.daymark_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('category', 'project', 'task', 'timeBlock', 'routine', 'preference')),
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index if not exists daymark_items_user_updated on public.daymark_items (user_id, updated_at);

-- Server clock for pull cursors: every write bumps updated_at.
create or replace function public.daymark_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists daymark_items_touch on public.daymark_items;
create trigger daymark_items_touch before insert or update on public.daymark_items
for each row execute function public.daymark_touch_updated_at();

-- Each person can only read and write their own rows.
alter table public.daymark_items enable row level security;

drop policy if exists "daymark own rows select" on public.daymark_items;
create policy "daymark own rows select" on public.daymark_items for select to authenticated using (user_id = auth.uid());
drop policy if exists "daymark own rows insert" on public.daymark_items;
create policy "daymark own rows insert" on public.daymark_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "daymark own rows update" on public.daymark_items;
create policy "daymark own rows update" on public.daymark_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- À exécuter dans Supabase > SQL Editor.
-- Cette migration crée une table compatible avec CloserFlow v1.
create extension if not exists pgcrypto;

create table if not exists public.prospects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  activity text default '',
  city text default '',
  phone text default '',
  website text default '',
  status text not null default 'nouveau'
    check (status in ('nouveau','contacte','interesse','gagne','perdu')),
  value numeric not null default 0,
  follow_up date,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.prospects enable row level security;

drop policy if exists "Users read own prospects" on public.prospects;
create policy "Users read own prospects"
on public.prospects for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own prospects" on public.prospects;
create policy "Users insert own prospects"
on public.prospects for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own prospects" on public.prospects;
create policy "Users update own prospects"
on public.prospects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own prospects" on public.prospects;
create policy "Users delete own prospects"
on public.prospects for delete
using (auth.uid() = user_id);

create index if not exists prospects_user_id_idx on public.prospects(user_id);
create index if not exists prospects_follow_up_idx on public.prospects(follow_up);

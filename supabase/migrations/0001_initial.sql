-- CloserFlow 0.1 — Schéma initial Supabase
create extension if not exists "pgcrypto";

create type public.company_role as enum ('owner','admin','member');
create type public.mission_status as enum ('prospect','visit','quote','accepted','planned','in_progress','completed','invoiced','paid','archived');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  siret text,
  vat_number text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  role public.company_role not null default 'owner',
  created_at timestamptz not null default now()
);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  company_name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  description text,
  status public.mission_status not null default 'prospect',
  address text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  price_ht numeric(12,2) not null default 0 check (price_ht >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.mission_timeline (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  event_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index clients_company_idx on public.clients(company_id);
create index clients_search_idx on public.clients(company_id, last_name, company_name);
create index missions_company_status_idx on public.missions(company_id, status);
create index missions_schedule_idx on public.missions(company_id, scheduled_start);
create index timeline_mission_idx on public.mission_timeline(mission_id, created_at desc);

create or replace function public.current_company_id() returns uuid language sql stable security definer set search_path=public as $$ select company_id from public.profiles where id = auth.uid() $$;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger missions_set_updated_at before update on public.missions for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.missions enable row level security;
alter table public.mission_timeline enable row level security;

create policy "company members read company" on public.companies for select using (id = public.current_company_id());
create policy "users read own profile" on public.profiles for select using (id = auth.uid() or company_id = public.current_company_id());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "company members manage clients" on public.clients for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "company members manage missions" on public.missions for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "company members manage timeline" on public.mission_timeline for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

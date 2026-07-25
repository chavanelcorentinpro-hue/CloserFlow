-- Schéma cible pour la migration PostgreSQL de CloserFlow 5
create extension if not exists pgcrypto;
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists memberships (
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null check (role in ('admin','manager','technician','viewer')),
  primary key (organization_id,user_id)
);
create table if not exists sync_snapshots (
  organization_id uuid references organizations(id) on delete cascade,
  revision bigint generated always as identity,
  device_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (organization_id,revision)
);

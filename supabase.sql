-- Supabase starter schema for ELVN CLUB MVP

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  event_date timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member',
  joined_at timestamptz not null default now()
);

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

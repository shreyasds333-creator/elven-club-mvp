-- Supabase v2 schema for ELVN CLUB (social fitness app)

-- users table is provided by auth; link by auth.users.id where needed

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_display text,
  image_url text,
  caption text,
  calories integer,
  created_at timestamptz not null default now()
);

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table if not exists crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid references crews(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now()
);

create table if not exists streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active date
);
-- (Challenges removed for MVP to keep schema focused)

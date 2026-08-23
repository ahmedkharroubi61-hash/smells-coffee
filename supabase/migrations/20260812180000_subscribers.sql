-- Marketing email list ("Club SmellS"). Collected from the site; the manager
-- exports these to run campaigns.
create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text,
  source     text,                          -- where they signed up: intro | order
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

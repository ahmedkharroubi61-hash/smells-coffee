-- Orders placed from the site, shown on the staff kitchen/counter screen.
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null,                 -- short human code staff call out
  status         text not null default 'new',   -- new | preparing | ready | done
  items          jsonb not null,                -- [{id,name,sizeLabel,quantity,price}]
  table_number   text,
  total_millimes integer not null,
  payment_method text,                          -- counter | online
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Staff screen lists active orders oldest-first; this index serves that.
create index if not exists orders_active_idx on public.orders (status, created_at);

-- Server-side access only (the Edge Function uses the service_role key, which
-- bypasses RLS). Enabling RLS with no policies blocks the public anon key.
alter table public.orders enable row level security;

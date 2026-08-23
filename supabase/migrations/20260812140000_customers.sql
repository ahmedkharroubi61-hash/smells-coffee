-- Customer accounts (optional — ordering still works as a guest).
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  phone      text unique not null,          -- normalized digits, the login id
  name       text not null,
  pass_salt  text not null,                 -- per-user PBKDF2 salt (hex)
  pass_hash  text not null,                 -- PBKDF2-SHA256 hash (hex)
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

-- Link an order to the customer who placed it (null for guest orders).
alter table public.orders add column if not exists customer_id uuid;
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);

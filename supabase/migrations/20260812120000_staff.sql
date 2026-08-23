-- Staff members, their shift state, and their running shift takings.
create table if not exists public.staff (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  pin_hash             text not null,               -- HMAC of the 4-digit PIN
  on_shift             boolean not null default false,
  shift_opened_at      timestamptz,
  shift_sales_millimes integer not null default 0,  -- resets to 0 on shift close
  shift_orders_count   integer not null default 0,
  created_at           timestamptz not null default now()
);

alter table public.staff enable row level security;

-- Orders gain: who the customer is, and which staff member served it.
alter table public.orders add column if not exists customer_name  text;
alter table public.orders add column if not exists served_by      uuid;
alter table public.orders add column if not exists served_by_name text;

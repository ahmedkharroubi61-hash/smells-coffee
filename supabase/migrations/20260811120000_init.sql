-- SmellS by Borbone — database schema (menu persistence + payment records).
--
-- Applied with `supabase db push`. Safe to re-run: everything is IF NOT EXISTS.

-- Key/value app state. Currently holds one row: the live menu (key = 'menu',
-- value = the JSON array of menu items). Kept generic so more app-wide state
-- can share it later without another table.
create table if not exists public.app_state (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- One row per payment attempt, keyed by our own order id (which we embed in
-- the Flouci return URLs). payment_id is Flouci's id, used by the webhook to
-- find its way back to the order. This lives in the database (not memory) so
-- an order survives cold starts between a customer paying and returning.
create table if not exists public.payments (
  order_id         text primary key,
  payment_id       text unique,
  status           text not null,          -- pending | succeeded | failed
  amount_millimes  integer not null,       -- authoritative amount, priced server-side
  items            jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists payments_payment_id_idx on public.payments (payment_id);

-- Lock both tables to server-side access only. The Edge Function reaches them
-- with the service_role key, which BYPASSES row-level security. Enabling RLS
-- with NO policies means the public anon key (exposed in any browser) cannot
-- read or write these tables through Supabase's auto-generated REST API.
alter table public.app_state enable row level security;
alter table public.payments  enable row level security;

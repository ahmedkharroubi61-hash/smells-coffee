-- Web Push subscriptions, one per (order, device). When an order is marked
-- ready, the backend pushes to every subscription tied to it — this is what
-- lets an iPhone (installed to the Home Screen) get a locked-screen alert.
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  endpoint     text not null,
  subscription jsonb not null,
  created_at   timestamptz not null default now(),
  unique (order_id, endpoint)
);
create index if not exists push_sub_order_idx on public.push_subscriptions (order_id);
alter table public.push_subscriptions enable row level security;

-- Marks an order as having already drawn down the inventory, so stock is
-- decremented exactly once (when the drink is made), never twice.
alter table public.orders add column if not exists consumed boolean not null default false;

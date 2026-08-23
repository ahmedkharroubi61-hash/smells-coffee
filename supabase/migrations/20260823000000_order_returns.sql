-- Order returns: a staff member can return a completed order (with a reason).
-- Returning reverses their shift credit, restocks the ingredients, and drops the
-- order out of their history — the order row stays "done" but flagged returned.
alter table public.orders add column if not exists returned      boolean not null default false;
alter table public.orders add column if not exists return_reason text;
alter table public.orders add column if not exists returned_at    timestamptz;

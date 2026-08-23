-- End-of-shift reports: saved when a staff member closes their till. Holds
-- their total, order count, and a per-product breakdown of what they made.
create table if not exists public.shift_reports (
  id             uuid primary key default gen_random_uuid(),
  staff_id       uuid,
  staff_name     text,
  opened_at      timestamptz,
  closed_at      timestamptz not null default now(),
  total_millimes integer not null default 0,
  orders_count   integer not null default 0,
  breakdown      jsonb not null default '{}'::jsonb,   -- { "Espresso (Grain)": 12, ... }
  created_at     timestamptz not null default now()
);

alter table public.shift_reports enable row level security;
create index if not exists shift_reports_recent_idx on public.shift_reports (closed_at desc);

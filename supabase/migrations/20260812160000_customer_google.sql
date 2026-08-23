-- Allow Google-authenticated customers (no phone/password of their own).
alter table public.customers alter column phone drop not null;
alter table public.customers alter column pass_salt drop not null;
alter table public.customers alter column pass_hash drop not null;

alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists google_sub text;

-- Google's stable user id, unique when present (NULLs stay distinct in Postgres,
-- so phone/password customers are unaffected).
create unique index if not exists customers_google_sub_idx on public.customers (google_sub) where google_sub is not null;

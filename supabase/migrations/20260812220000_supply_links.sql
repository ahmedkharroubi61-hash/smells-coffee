-- Link a supply to the menu products that need it. When the supply runs out
-- (quantity <= 0), those products show as unavailable on the menu automatically.
-- Stored as an array of menu "group" ids (a product = all its sizes).
alter table public.supplies add column if not exists menu_links jsonb not null default '[]'::jsonb;

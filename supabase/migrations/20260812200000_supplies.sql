-- Raw supplies / ingredients inventory (cups, Nutella, milk, water, fruits…).
-- Baristas adjust the counts during service; the owner sees what's running low.
create table if not exists public.supplies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  unit          text not null default 'unité',
  quantity      numeric not null default 0,
  low_threshold numeric not null default 0,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.supplies enable row level security;

-- Seed a starter set matching a SmellS bar (owner can edit / add / remove).
insert into public.supplies (name, unit, quantity, low_threshold, sort_order)
select * from (values
  ('Gobelets M',   'gobelets',   200, 50, 1),
  ('Gobelets L',   'gobelets',   200, 50, 2),
  ('Lait',         'L',           12,  4, 3),
  ('Nutella',      'pots',         4,  1, 4),
  ('Speculoos',    'pots',         4,  1, 5),
  ('Eau 0.5L',     'bouteilles',  48, 12, 6),
  ('Eau 1L',       'bouteilles',  24,  6, 7),
  ('Banane',       'kg',           5,  2, 8),
  ('Fraise',       'kg',           3,  1, 9)
) as seed(name, unit, quantity, low_threshold, sort_order)
where not exists (select 1 from public.supplies);

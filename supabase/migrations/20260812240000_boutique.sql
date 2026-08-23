-- E-market ("Boutique"): take-home retail products + their orders.
create table if not exists public.boutique_products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric not null default 0,     -- DT
  image       text,                           -- image URL (optional)
  category    text not null default 'Boutique',
  available   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.boutique_orders (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null,
  items          jsonb not null,                -- [{id,name,price,quantity}]
  total_millimes integer not null,
  fulfillment    text not null default 'pickup',-- delivery | pickup
  customer_name  text,
  customer_phone text,
  address        text,                          -- null for pickup
  status         text not null default 'new',   -- new | preparing | ready | done
  created_at     timestamptz not null default now()
);

alter table public.boutique_products enable row level security;
alter table public.boutique_orders   enable row level security;

create index if not exists boutique_orders_active_idx on public.boutique_orders (status, created_at);

-- Seed a starter catalogue (owner edits / adds photos later).
insert into public.boutique_products (name, description, price, category, sort_order)
select * from (values
  ('Café Borbone — Grains 1kg',  'Notre mélange signature en grains, torréfaction italienne.',        38, 'Café',        1),
  ('Café Borbone — Moulu 250g',  'Café moulu, prêt pour votre cafetière.',                            12, 'Café',        2),
  ('Capsules Borbone — x50',     'Compatibles Nespresso®, intensité 12.',                             28, 'Capsules',    3),
  ('Mug SmellS by Borbone',      'Mug en céramique, logo SmellS.',                                    18, 'Accessoires', 4),
  ('Coffret Découverte',         'Assortiment café + capsules + mug, idéal cadeau.',                  65, 'Coffrets',    5),
  ('Sirop Caramel 75cl',         'Pour recréer nos boissons à la maison.',                            15, 'Sirops',      6)
) as seed(name, description, price, category, sort_order)
where not exists (select 1 from public.boutique_products);

-- Atomic inventory adjustment. A single UPDATE ... quantity + delta so two
-- baristas tapping the same item (or concurrent orders drawing it down) can't
-- clobber each other's change via read-modify-write. Clamped at zero.
create or replace function public.adjust_supply_quantity(p_id uuid, p_delta integer)
returns integer
language sql
as $$
  update public.supplies
     set quantity = greatest(0, quantity + p_delta)
   where id = p_id
  returning quantity;
$$;

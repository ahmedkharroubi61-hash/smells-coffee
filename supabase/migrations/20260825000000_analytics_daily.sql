-- Owner analytics: daily income from completed (non-returned) orders, grouped
-- by the café's local calendar day (Africa/Tunis). The frontend rolls these up
-- into months and computes best/worst day, averages, and month-vs-month.
create or replace function public.analytics_daily()
returns table(day date, total_millimes bigint, orders_count bigint)
language sql
stable
as $$
  select
    (updated_at at time zone 'Africa/Tunis')::date as day,
    sum(total_millimes)::bigint                     as total_millimes,
    count(*)::bigint                                as orders_count
  from public.orders
  where status = 'done' and coalesce(returned, false) = false
  group by 1
  order by 1;
$$;

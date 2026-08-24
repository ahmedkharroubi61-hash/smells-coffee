-- Anti-spam: a per-device key on each order (an HMAC of the client IP, so no
-- raw IP is ever stored). Lets the backend cap how many unfinished orders one
-- device may have and throttle rapid bursts, without a shared rate-limit store.
alter table public.orders add column if not exists client_key text;
create index if not exists orders_client_key_idx on public.orders (client_key, created_at desc);

-- Optional customer mobile captured at checkout.
alter table public.orders
  add column if not exists customer_mobile text;

-- Per-product discount % for catalog / profit % display.
alter table public.products
  add column if not exists discount_percent numeric(5, 2) not null default 0
  check (discount_percent >= 0 and discount_percent <= 100);

-- Drop unused flat ₹ discount if it was added earlier.
alter table public.products
  drop column if exists discount_amount;

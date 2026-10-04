-- Snapshot which UPI account was shown when the order was marked paid.
alter table public.orders
  add column if not exists upi_id text,
  add column if not exists upi_name text;

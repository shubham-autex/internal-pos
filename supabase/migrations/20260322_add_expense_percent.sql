-- Add product expense % (percent of cost price used in costing / info).
alter table public.products
  add column if not exists expense_percent numeric(5, 2) not null default 0
  check (expense_percent >= 0 and expense_percent <= 100);

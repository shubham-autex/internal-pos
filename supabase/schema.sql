-- Mela Stall POS schema
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  description text,
  kind text not null default 'simple' check (kind in ('simple', 'combo')),
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  sell_price numeric(12, 2) not null check (sell_price >= 0),
  expense_percent numeric(5, 2) not null default 0 check (expense_percent >= 0 and expense_percent <= 100),
  stock integer not null default 0,
  tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Combo BOM: combo sell price is on products; cost/expense come from components.
create table if not exists public.product_components (
  combo_id uuid not null references public.products (id) on delete cascade,
  component_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (combo_id, component_id),
  check (combo_id <> component_id)
);

create index if not exists product_components_component_id_idx
  on public.product_components (component_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references auth.users (id),
  subtotal numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  total numeric(12, 2) not null,
  cost_total numeric(12, 2) not null,
  profit numeric(12, 2) not null,
  payment_method text not null check (payment_method in ('upi', 'cash')),
  cash_tendered numeric(12, 2),
  cash_change numeric(12, 2),
  -- Snapshot of the UPI QR shown when marked paid (null for cash).
  upi_id text,
  upi_name text,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_sell_price numeric(12, 2) not null,
  unit_cost_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null,
  line_cost numeric(12, 2) not null,
  line_profit numeric(12, 2) not null
);

create index if not exists products_sku_idx on public.products (sku);
create index if not exists products_active_idx on public.products (active);
create index if not exists products_tags_gin_idx on public.products using gin (tags);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.products enable row level security;
alter table public.product_components enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Authenticated staff can read products"
  on public.products for select
  to authenticated
  using (true);

create policy "Authenticated staff can insert products"
  on public.products for insert
  to authenticated
  with check (true);

create policy "Authenticated staff can update products"
  on public.products for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated staff can read product components"
  on public.product_components for select
  to authenticated
  using (true);

create policy "Authenticated staff can insert product components"
  on public.product_components for insert
  to authenticated
  with check (true);

create policy "Authenticated staff can update product components"
  on public.product_components for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated staff can delete product components"
  on public.product_components for delete
  to authenticated
  using (true);

create policy "Authenticated staff can read orders"
  on public.orders for select
  to authenticated
  using (true);

create policy "Authenticated staff can insert orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = staff_id);

create policy "Authenticated staff can read order items"
  on public.order_items for select
  to authenticated
  using (true);

create policy "Authenticated staff can insert order items"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.staff_id = auth.uid()
    )
  );

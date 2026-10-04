-- Combo products: own sell price; cost/expense/stock from component products.

alter table public.products
  add column if not exists kind text not null default 'simple';

alter table public.products
  drop constraint if exists products_kind_check;

alter table public.products
  add constraint products_kind_check check (kind in ('simple', 'combo'));

create table if not exists public.product_components (
  combo_id uuid not null references public.products (id) on delete cascade,
  component_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (combo_id, component_id),
  check (combo_id <> component_id)
);

create index if not exists product_components_component_id_idx
  on public.product_components (component_id);

alter table public.product_components enable row level security;

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

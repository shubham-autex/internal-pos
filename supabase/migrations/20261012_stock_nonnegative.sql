-- A sale must not persist a negative stock count.
alter table public.products
  drop constraint if exists products_stock_nonnegative;

alter table public.products
  add constraint products_stock_nonnegative check (stock >= 0);

-- Lets a failed checkout remove its own order after stock is restored.
drop policy if exists "Authenticated staff can delete own orders" on public.orders;
create policy "Authenticated staff can delete own orders"
  on public.orders for delete
  to authenticated
  using (auth.uid() = staff_id);

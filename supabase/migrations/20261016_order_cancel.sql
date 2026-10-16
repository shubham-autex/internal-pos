-- Allow staff to cancel orders (status paid -> cancelled).
create policy "Authenticated staff can update orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

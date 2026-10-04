-- Product tags for dashboard grouping (products sharing a tag roll up together).
alter table public.products
  add column if not exists tags text[] not null default '{}';

create index if not exists products_tags_gin_idx
  on public.products using gin (tags);

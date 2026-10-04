insert into public.products (name, sku, description, cost_price, sell_price, stock) values
  ('Masala Chai Cup', 'CHAI-01', 'Hot masala chai, disposable cup', 8, 20, 200),
  ('Samosa (2 pcs)', 'SAM-02', 'Crispy potato samosa pair', 18, 40, 120),
  ('Jalebi Plate', 'JAL-03', 'Fresh jalebi, 100g plate', 25, 60, 80),
  ('Cotton Candy', 'CANDY-04', 'Pink spun sugar stick', 12, 30, 150),
  ('Whistle Toy', 'TOY-05', 'Plastic mela whistle', 10, 25, 100),
  ('LED Glow Stick', 'LED-06', 'Battery glow stick', 22, 50, 90),
  ('Pakora Plate', 'PAK-07', 'Mixed vegetable pakora', 30, 70, 60),
  ('Bottled Water 500ml', 'WAT-08', 'Raw / packaged drinking water', 7, 20, 250)
on conflict (sku) do nothing;

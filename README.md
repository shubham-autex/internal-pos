# Mela Stall POS

Internal Next.js + Supabase app for running a mela stall: staff login, product catalog, cart, QR scan-to-add, profit/discounts, UPI QR + cash checkout.

## Setup

1. Create a project at [Supabase](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Authentication → Users → add a staff user (email + password).
4. Copy env values:

```bash
cp .env.local.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon key)
- `NEXT_PUBLIC_UPI_ID` / `NEXT_PUBLIC_UPI_NAME` for a single payment QR
- Or `NEXT_PUBLIC_UPI_ACCOUNTS` JSON list for multiple UPIs (saved on each paid order)

5. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Flows

| Area | What it does |
| --- | --- |
| `/` | Product list, add to cart, scan QR to add, clear cart |
| `/checkout` | Totals, **i** → profit page, UPI QR + mark paid, cash + change |
| Checkout **i** | Popup: line profit + custom ₹ / % discounts |
| `/products/new` | Add product with optional SKU scan |
| `/products/[id]` | Per-item cost / sell / profit |
| `/orders` | Recent paid orders |

Product QR / barcode should encode the product `sku` (seed examples: `CHAI-01`, `SAM-02`, …).

## Stack

- Next.js App Router (`proxy.ts` for session refresh)
- Supabase Auth + Postgres (RLS for authenticated staff)
- Client cart in `localStorage`
- `barcode-detector` (ZXing) for SKU/QR scanning with a zoomed crop, `qrcode` for UPI QR

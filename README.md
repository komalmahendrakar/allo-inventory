# Allo Inventory

Live demo: [add Vercel URL after deployment]

---

## Stack

- Next.js 16 (App Router) + TypeScript
- Prisma + PostgreSQL (Supabase)
- Zod validation
- Tailwind CSS + shadcn/ui
- Vercel (hosting + cron)

---

## Running locally

```bash
npm install
cp .env.example .env
npx prisma db push
node prisma/seed.js
npm run dev
```

**Env vars needed:**
DATABASE_URL    Supabase transaction pooler URL (port 6543)
DIRECT_URL      Supabase session pooler URL (port 5432)

---

## The core problem: race conditions at checkout

Two users click Reserve simultaneously for the last unit. A naive 
read-then-write lets both through — both see "1 available", both 
create a reservation, one unit is oversold.

**My fix:** a single atomic SQL UPDATE with a WHERE guard:

```sql
UPDATE "Stock"
SET "reservedUnits" = "reservedUnits" + quantity
WHERE "productId" = ? AND "warehouseId" = ?
  AND ("totalUnits" - "reservedUnits") >= quantity
```

If 0 rows are affected → not enough stock → 409. Postgres guarantees 
only one concurrent request can win the same row. No distributed 
lock needed.

---

## Expiry

Two layers:

1. **Lazy cleanup** — `GET /api/products` releases expired PENDING 
   reservations inline before returning stock counts. Always accurate 
   when a user loads the product page.

2. **Vercel Cron** — `vercel.json` schedules `GET /api/cron/release-expired` 
   every minute. Catches reservations that are never read — user closes 
   the tab and never returns. Vercel calls this automatically in production.

---

## Idempotency (bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` 
accept an `Idempotency-Key` header.

- First request runs normally and stores the key + response in Postgres
- Retries with the same key return the cached response immediately
- No duplicate stock decrement, no duplicate reservation created

Used Postgres instead of Redis — simpler, one less moving part. 
Downside: no automatic TTL, keys accumulate over time. With more 
time I'd use Redis with a native TTL.

---

## API



| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | List products and available stock |
| GET | `/api/warehouses` | List warehouses |
| GET | `/api/reservations/:id` | Get reservation by ID |
| POST | `/api/reservations` | Create reservation, returns 409 if stock unavailable |
| POST | `/api/reservations/:id/confirm` | Confirm reservation, returns 410 if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |


---

## Trade-offs

- **`db push` instead of migrations** — port 5432 was blocked on 
  my local network. In a team setup I'd use proper migration files 
  for schema history and rollback support.
- **No auth** — reservations aren't tied to a user session. In 
  production every reservation would be scoped to an authenticated user.
- **Quantity hardcoded to 1 in UI** — the API accepts any quantity, 
  the frontend doesn't expose a selector yet.
- **Idempotency keys don't expire** — stored in Postgres with no TTL. 
  With more time I'd use Redis so keys clean themselves up automatically.
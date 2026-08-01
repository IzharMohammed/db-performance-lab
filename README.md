# Database Performance Lab

A deliberately **unoptimized** NestJS e-commerce backend for practicing PostgreSQL query planning, indexes, joins, aggregation, pagination, and database internals. It is not a production template.

The schema declares no secondary indexes. PostgreSQL creates indexes only for table primary keys and `users.email`'s unique constraint. Do not add indexes until you are ready to run an experiment.

## Stack

- NestJS + TypeScript
- PostgreSQL 17
- Drizzle ORM for the application database boundary
- Faker.js batch generator
- Docker Compose

## Run

```bash
cp .env.example .env
docker compose up --build
```

The API listens on `http://localhost:3000`. Compose initializes an empty database from `src/database/init.sql` on its first start. For local development, install dependencies with `npm install`, start PostgreSQL with `docker compose up -d postgres`, apply the schema using `psql "$DATABASE_URL" -f src/database/init.sql`, and run `npm run start:dev`.

## Seed

Use the small dataset first:

```bash
npm install
npm run seed:small
```

The full command generates 31,600,600 rows: 100,000 users, 100 categories, 500 brands, 1,000,000 products, 5,000,000 orders, 20,000,000 items, 3,000,000 reviews, and 2,000,000 wishlist rows.

```bash
SEED_BATCH_SIZE=5000 npm run seed
```

The seeder inserts one batch at a time and keeps only that batch in memory. Full seeding needs significant disk space and can take a long time on a laptop; use a local PostgreSQL volume with ample free storage. Start from an empty schema, because foreign-key IDs are generated sequentially by the seed plan.

## Reset

This removes all local lab data:

```bash
docker compose down -v
docker compose up -d postgres
```

Then seed again. The mounted initialization SQL runs when PostgreSQL creates the fresh volume.

## Workloads

| Endpoint | Purpose |
| --- | --- |
| `GET /products?page=3000&limit=50` | Offset pagination plus sorting/filtering |
| `GET /products/cursor?cursor=10000&limit=50` | Cursor-style pagination without optimization |
| `GET /products/search?q=headphones` | `ILIKE`/`LIKE` text search |
| `GET /products?category=2&brand=8&minPrice=20&maxPrice=200&minRating=4&createdFrom=2024-01-01&createdTo=2025-01-01` | Multiple predicates and `BETWEEN` |
| `GET /products/42` | Joined product detail |
| `GET /orders/42` | Order detail with user and line items |
| `GET /orders/user/42?status=paid&from=2024-01-01&to=2025-01-01` | User order history and aggregate |
| `GET /users?country=India&city=Mumbai&page=5` | User filters and offset |
| `GET /users/42/orders` | User-to-order join |
| `GET /reviews/product/42?minRating=4` | Product review lookup |
| `GET /dashboard/top-products` | Large join, `GROUP BY`, `HAVING`, `COUNT`, `SUM`, `AVG` |
| `GET /dashboard/top-categories` | `DISTINCT`, `MIN`, `MAX`, aggregates |
| `GET /dashboard/monthly-sales?from=2024-01-01&to=2025-01-01` | Date grouping |
| `GET /dashboard/top-customers?countries=India,Japan` | `IN` filter and customer aggregation |
| `GET /dashboard/orders-per-country` | Country grouping |
| `GET /explain/products?category=2&sortBy=price` | `EXPLAIN ANALYZE` JSON plan |

`GET /orders/:id` and a literal `GET /orders/:userId` cannot coexist: they have the same HTTP route shape. This lab uses the unambiguous `GET /orders/user/:userId` for the user-history workload.

## Benchmark

Use `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)` through `GET /explain/products`, or issue it directly in `psql` against a workload query. Record elapsed time, shared buffers, rows removed by filters, and query plan before every schema change. Add one index or rewrite at a time, rerun the same query parameters, and compare with the baseline. Verify the current indexes with:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

Before adding your own indexes, this should show only primary-key indexes and `users_email_key`.

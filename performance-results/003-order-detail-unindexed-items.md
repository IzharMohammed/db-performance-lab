# 003 — Order detail and an unindexed foreign-key join

## Endpoint

`GET http://localhost:4000/orders/900000`

## Observed result

- First response: approximately `1.21 s`
- Later responses: approximately `370–409 ms`

## Query shape

The order itself is found using the automatic primary-key index on `orders.id`. The expensive part is finding its items:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  o.*,
  u.name AS user_name,
  u.email,
  oi.quantity,
  oi.price,
  p.name AS product_name
FROM orders o
JOIN users u ON u.id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE o.id = 900000;
```

## How to interpret the timing difference

The first request reads database pages from disk into PostgreSQL's shared buffer cache and the operating system's file cache. Later requests reuse those cached pages, so they are faster even when PostgreSQL uses the same execution plan.

In the plan, look for:

```text
Index Scan using orders_pkey on orders
Seq Scan on order_items
  Filter: (order_id = 900000)
```

`orders_pkey` is good: PostgreSQL finds one order directly. The `Seq Scan on order_items` is the intended slow part. There is no automatic index on a foreign key, so PostgreSQL may inspect every `order_items` row to find the few that belong to this order.

With `BUFFERS`, compare the first and later runs:

- More `shared read` blocks on the first run means data came from disk.
- More `shared hit` blocks on later runs means data came from cache.

## Index hypothesis — do not run until the baseline is recorded

For this query, the first index experiment belongs on the foreign-key column used to find the line items:

```sql
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
```

### Result before index

- Execution time: `387 ms`
- Api response time: `403 ms`

## Result after index

- Execution time: `0.516 ms`
- Api response time: `32 sec`

Do not add an index on `orders.id`, `users.id`, or `products.id`; they are already primary keys. After measuring the index experiment, remove it so future lab experiments start from the intended no-secondary-index baseline:

```sql
DROP INDEX order_items_order_id_idx;
```

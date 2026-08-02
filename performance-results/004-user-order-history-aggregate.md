# 004 — User order history with status and date filters

## Endpoint

`GET /orders/user/42?status=paid&from=2024-01-01&to=2025-01-01`

## Baseline query

Run this before adding any secondary index:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  o.*,
  COUNT(oi.id) AS item_count,
  SUM(oi.quantity) AS units
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = 42
  AND o.status = 'paid'
  AND o.created_at BETWEEN '2024-01-01'::timestamptz AND '2025-01-01'::timestamptz
GROUP BY o.id
HAVING SUM(oi.quantity) IS NULL OR SUM(oi.quantity) >= 1
ORDER BY o.created_at DESC
LIMIT 100;
```

## Record the baseline

- Execution time: `145 ms` and Rows Removed by Filter: `1666666`
- Api response time: `123ms`

## How to reason about this query

The query has two separate lookup problems:

1. Find orders matching `user_id`, `status`, and the `created_at` range.
2. For each matched order, find its related `order_items` rows for the aggregate.

Without secondary indexes, expect at least a `Seq Scan on orders`. If the plan also shows `Seq Scan on order_items`, PostgreSQL is repeatedly or broadly scanning the large line-items table to calculate `COUNT` and `SUM`.

The `GROUP BY`, `HAVING`, and `ORDER BY` happen after the relevant rows have been found. They may introduce `HashAggregate`, `GroupAggregate`, or `Sort` nodes. Do not optimize them before identifying the expensive scan(s).

## Index experiments

Test one index at a time and rerun the exact baseline query after each test.

### Experiment 1 — find a user's matching orders

```sql
CREATE INDEX orders_user_status_created_at_idx
ON orders (user_id, status, created_at DESC);
```

This index follows the equality filters first (`user_id`, then `status`) and the date range/order column last (`created_at`). Check whether PostgreSQL replaces `Seq Scan on orders` with an index-based scan.

```sql
DROP INDEX orders_user_status_created_at_idx;
```

### Experiment 2 — find line items for each order

```sql
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
```

This targets the join condition `oi.order_id = o.id`. Check whether `Seq Scan on order_items` becomes `Index Scan using order_items_order_id_idx`.

```sql
DROP INDEX order_items_order_id_idx;
```

### Experiment 3 — measure both together

Create both indexes only after recording the individual experiments. This shows whether the query benefits independently from selective order lookup and fast line-item lookup.

## Conclusion

- Baseline execution time: `0.133ms`
- Api response time: `7ms`

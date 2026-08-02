# 008 — Dashboard top products aggregate

## Endpoint

`GET /dashboard/top-products`

## Baseline query

```sql
EXPLAIN ANALYZE
SELECT
  p.id,
  p.name,
  COUNT(oi.id) AS times_ordered,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.quantity * oi.price) AS revenue,
  AVG(r.rating) AS average_review_rating
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN reviews r ON r.product_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(oi.id) > 0
ORDER BY revenue DESC NULLS LAST
LIMIT 20;
```

## Observed result

- API response time: approximately `35 s`
- PostgreSQL execution time: `33053.698 ms` (approximately `33 s`)

### Captured plan summary

```text
Limit (actual time=32964.831..33024.356 rows=20)
  -> Sort by revenue DESC
       Sort Method: top-N heapsort  Memory: 28kB
       -> Finalize GroupAggregate (actual time=12740.952..32478.555 rows=1000000)
            Group Key: p.id
            -> Gather Merge (2 workers launched)
                 -> Partial GroupAggregate
                      -> Merge Left Join on p.id = r.product_id
                           -> Sort on p.id
                                Sort Method: external merge
                                Disk: about 390–419 MB per worker
                                -> Parallel Hash Right Join on oi.product_id = p.id
                                     -> Parallel Seq Scan on order_items
                                     -> Parallel Seq Scan on products
                           -> Materialize
                                -> Sort on r.product_id
                                     Sort Method: external merge
                                     Disk: 76 MB per worker
                                     -> Seq Scan on reviews
Execution Time: 33053.698 ms
```

## How to reason about this plan

The `top-N heapsort` is cheap: PostgreSQL only keeps the best 20 grouped products in `28 kB`. The expensive work happens before that:

- PostgreSQL scans all `20,000,000` order items and all `3,000,000` reviews.
- It performs large disk-backed (`external merge`) sorts because the intermediate data does not fit in memory.
- It groups approximately `1,000,000` products before it can choose the top 20.

Parallel workers help, but they do not avoid reading and sorting the large tables. They only divide the work.

## Query correctness issue: join fan-out

This query has two one-to-many joins from `products`:

```text
products -> order_items
products -> reviews
```

Joining both raw child tables in one query multiplies rows for each product. For example, a product with 20 order items and 3 reviews becomes 60 intermediate rows. This makes the query slow **and** makes `COUNT(oi.id)`, `SUM(oi.quantity)`, and `SUM(oi.quantity * oi.price)` too large because every order item is repeated once for each review.

Adding indexes does not fix this incorrect multiplication. Record this baseline before changing anything.

## Query rewrite experiment

Aggregate each child table independently, then join the smaller per-product results:

```sql
EXPLAIN ANALYZE
SELECT
  p.id,
  p.name,
  sales.times_ordered,
  sales.units_sold,
  sales.revenue,
  review_stats.average_review_rating
FROM products p
JOIN (
  SELECT
    product_id,
    COUNT(id) AS times_ordered,
    SUM(quantity) AS units_sold,
    SUM(quantity * price) AS revenue
  FROM order_items
  GROUP BY product_id
) AS sales ON sales.product_id = p.id
LEFT JOIN (
  SELECT product_id, AVG(rating) AS average_review_rating
  FROM reviews
  GROUP BY product_id
) AS review_stats ON review_stats.product_id = p.id
ORDER BY sales.revenue DESC NULLS LAST
LIMIT 20;
```

Compare its execution time and verify that the revenue/count values are now correct. This rewrite is the first experiment; do not add indexes until after recording its plan.

## Index experiments after the rewrite

If scans remain the main cost after the rewrite, test one index at a time:

```sql
CREATE INDEX order_items_product_id_idx ON order_items (product_id);
CREATE INDEX reviews_product_id_idx ON reviews (product_id);
```

Measure each independently and drop each after the experiment:

```sql
DROP INDEX order_items_product_id_idx;
DROP INDEX reviews_product_id_idx;
```

## Conclusion

- Baseline execution time: `33053.698 ms`
- Main cost: full scans, disk-backed sorts, and aggregation across very large tables
- Root query issue: row multiplication from two raw one-to-many joins
- First next step: rewrite with separate aggregates, then measure indexes

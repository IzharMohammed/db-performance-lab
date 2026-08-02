# 007 — Product reviews filtered by rating

## Endpoint

`GET /reviews/product/1000000?minRating=4`

## Baseline query

```sql
EXPLAIN ANALYZE
SELECT
  r.*,
  u.name AS user_name
FROM reviews AS r
JOIN users AS u ON u.id = r.user_id
WHERE r.product_id = 1000000
  AND r.rating >= 4
ORDER BY r.created_at DESC
LIMIT 100;
```

## Observed result

- PostgreSQL execution time: `75.436 ms`
- API response time: `90 ms`

## How to reason about this plan

`Parallel Seq Scan on reviews` is the main cost. PostgreSQL launches three processes (the leader plus two workers) and still examines approximately 3,000,000 review rows in total. `Rows Removed by Filter: 1000000` appears once per worker, so multiply it by the three loops.

The automatic `users_pkey` index makes the join to the matching review's author efficient. The `Sort` is not a problem: only one review reached it and the sort used `25 kB`.

The API's `80 ms` includes HTTP, NestJS, database connection/pool work, query execution, and JSON serialization. PostgreSQL's `75.436 ms` is only the database execution measured by `EXPLAIN ANALYZE`.

## Index experiment

Test an index that first finds reviews for one product and then supplies them in the requested order:

```sql
CREATE INDEX reviews_product_created_at_idx
ON reviews (product_id, created_at DESC);
```

Rerun the exact baseline query. Look for an `Index Scan using reviews_product_created_at_idx on reviews` instead of `Parallel Seq Scan on reviews`. PostgreSQL may still apply `rating >= 4` as a filter, but it should only inspect reviews belonging to product 42.

Do not add an index on `users.id`; `users_pkey` already exists and is used by the plan.

Then remove the experiment index to restore the lab baseline:

```sql
DROP INDEX reviews_product_created_at_idx;
```

## Conclusion

- Baseline execution time: `0.081 ms`
- Baseline API response time: `7 ms`

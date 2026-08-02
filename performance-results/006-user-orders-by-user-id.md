# 006 — User orders filtered by user ID

## Endpoint

`GET /users/42/orders`

## Baseline query

```sql
EXPLAIN ANALYZE
SELECT
  u.id AS user_id,
  u.name,
  o.id AS order_id,
  o.status,
  o.total_amount,
  o.created_at
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.id = 42
ORDER BY o.created_at DESC;
```

## Observed result

- PostgreSQL execution time: `0.202 ms`
- API response time: `18 ms`

### Captured plan

```text
Sort (actual time=0.133..0.135 rows=50 loops=1)
  Sort Key: o.created_at DESC
  Sort Method: quicksort  Memory: 28kB
  -> Nested Loop Left Join (actual time=0.042..0.100 rows=50 loops=1)
       -> Index Scan using users_pkey on users u
            Index Cond: (id = 42)
       -> Bitmap Heap Scan on orders o
            Recheck Cond: (user_id = 42)
            Heap Blocks: exact=50
            -> Bitmap Index Scan on orders_user_status_created_at_idx
                 Index Cond: (user_id = 42)
Planning Time: 2.882 ms
Execution Time: 0.202 ms
```

## Important comparison note

`orders_user_status_created_at_idx` is not an automatic PostgreSQL index. It was created during the earlier order-history index experiment, so this result is not the original no-secondary-index baseline.

To compare the indexed and unindexed plans fairly, drop this experimental index, rerun the exact query, and record that result separately:

```sql
DROP INDEX orders_user_status_created_at_idx;
```

## How to reason about this plan

The `Index Scan using users_pkey` is automatic because `users.id` is the primary key. PostgreSQL finds user 42 immediately.

The `Bitmap Index Scan on orders_user_status_created_at_idx` finds the 50 matching orders without scanning the entire `orders` table. PostgreSQL then visits the matching table rows with the `Bitmap Heap Scan`.

The final `Sort` is not a problem: it sorts only 50 rows, uses `28 kB`, and contributes very little to the `0.202 ms` database execution time.

The index order is `(user_id, status, created_at DESC)`. This query does not filter by `status`, so PostgreSQL cannot use that index's `created_at` ordering across every status; it performs the very small final sort instead.

The API's `18 ms` includes HTTP, NestJS, database connection/pool work, query execution, and JSON serialization. PostgreSQL's `0.202 ms` is only the database execution measured by `EXPLAIN ANALYZE`.

## Index experiment

The existing experimental index is already very effective for this query. Do not add another index just to remove a `28 kB` sort.

If this endpoint later returns many orders per user, test an index that matches its exact predicate and order:

```sql
CREATE INDEX orders_user_created_at_idx ON orders (user_id, created_at DESC);
```

Rerun the exact baseline query. Check whether the `Sort` is gone and whether PostgreSQL uses `orders_user_created_at_idx`.

Then remove the experiment index to restore the lab baseline:

```sql
DROP INDEX orders_user_created_at_idx;
```

## Conclusion

- Baseline PostgreSQL execution time: `0.202 ms`
- Baseline API response time: `18 ms`
- Main benefit: secondary index lookup on `orders.user_id`

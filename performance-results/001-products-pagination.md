# 001 — Products offset pagination baseline

## Endpoint

`GET http://localhost:4000/products?page=100&limit=50`

## Before adding an index

Run this in Beekeeper Studio. PostgreSQL placeholders such as `$1` are supplied by the application, so replace them with concrete values when running manually.

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  p.id,
  p.name,
  p.description,
  p.price,
  p.stock,
  p.rating,
  p.created_at,
  b.name AS brand_name,
  c.name AS category_name
FROM products p
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id
ORDER BY p.created_at DESC, p.id DESC
LIMIT 100 OFFSET 999900;
```

### Result before index

- Execution time: `541.093 ms`
- Api response time: `462ms`

## How to interpret this query

There is no `WHERE` clause. PostgreSQL must consider all products, produce their requested order, then discard 999,900 rows and return 100.

- `Seq Scan on products` means PostgreSQL reads the whole products table. With no useful ordering index, this is expected.
- `Sort` means PostgreSQL sorted product rows by `created_at DESC, id DESC`. This is the primary cost to investigate for this query.
- `Hash` / `Hash Join` for `brands` and `categories` can be completely reasonable: those tables are small lookup tables (500 and 100 rows in the full dataset).
- `Index Scan using brands_pkey` or `categories_pkey` is also normal. Those primary-key indexes are automatic and already exist.
- `external merge` means the sort exceeded `work_mem` and spilled to temporary files. This confirms the sort is expensive.
- The large offset means PostgreSQL still walks past 999,900 ordered rows before returning the requested 100.

## After adding an index

Create one test index. It matches the `ORDER BY` on the large `products` table:

```sql
CREATE INDEX products_created_at_id_desc_idx
ON products (created_at DESC, id DESC);
```

Then run the exact same query again:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  p.id,
  p.name,
  p.description,
  p.price,
  p.stock,
  p.rating,
  p.created_at,
  b.name AS brand_name,
  c.name AS category_name
FROM products p
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id
ORDER BY p.created_at DESC, p.id DESC
LIMIT 100 OFFSET 999900;
```

### Result after index

- Execution time: `1312.121 ms`
- Api response time: `1.21 sec`

Do not index `brands.name` or `categories.name` for this query. Neither column is filtered or sorted, while their automatic primary-key indexes already support the joins.

After recording the result, remove the test index before the next experiment:

```sql
DROP INDEX products_created_at_id_desc_idx;
```

## Offset lesson

Even if the ordering index avoids the expensive sort, a larger offset still makes PostgreSQL walk and discard more index entries. Compare this endpoint with cursor pagination after finishing the offset baseline.

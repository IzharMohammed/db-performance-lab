# 002 — Product primary-key lookup

## Endpoint

`GET http://localhost:4000/products/900000`

## Observed result

- API response time: approximately `12 ms`
- New index added: none

## Query to inspect in Beekeeper Studio

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  p.*,
  b.name AS brand_name,
  c.name AS category_name
FROM products p
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id
WHERE p.id = 900000;
```

## Expected plan

Look for a node similar to:

```text
Index Scan using products_pkey on products
```

`products_pkey` exists automatically because `products.id` is the primary key. The joins can use the automatic primary-key indexes on `brands.id` and `categories.id` too.

## Conclusion

This is an efficient primary-key lookup. Do not create another index on `products.id`: it duplicates `products_pkey`, uses extra disk space, and makes inserts or updates more expensive without improving this query.

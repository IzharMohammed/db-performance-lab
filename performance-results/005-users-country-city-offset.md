# 005 — Users filtered by country and city with offset pagination

## Endpoint

`GET /users?country=India&city=Mumbai&page=5`

The default API limit is `50`, so page 5 uses `LIMIT 50 OFFSET 200`.

## Baseline query

Run the endpoint's exact filters in Beekeeper Studio:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, email, country, city, created_at
FROM users
WHERE 1 = 1
  AND country = 'Jersey'
  AND city = 'East Mackenziefield'
ORDER BY created_at DESC
LIMIT 100
```

## Observed result

- PostgreSQL execution time: `7.498 ms`
- API response time: `54 ms`

```

## Index experiment

Test one index matching the equality filters and requested order:

```sql
CREATE INDEX users_country_city_created_at_idx
ON users (country, city, created_at DESC);
```

Rerun the exact baseline query. Look for `Index Scan using users_country_city_created_at_idx on users` and confirm that the `Seq Scan` and `Sort` are gone or reduced.

Then remove the experiment index to restore the lab baseline:

```sql
DROP INDEX users_country_city_created_at_idx;
```

## Conclusion

- Baseline execution time: `0.069 ms`
- Api response time: `8 ms`

# The warehouse slice in BigQuery

`shop-mart.sql` builds the dataset `shop_mart` (location `me-west1`) in the course's Google Cloud
project: the same star as `../seed/05-shop-mart.sql` builds in the lab's Postgres, from the same
formulas. A deployed agent reads this copy, because a service in the cloud cannot reach a laptop.

The instructor runs it once per project, signed in as the project's owner:

```sh
bq query --project_id <project> --use_legacy_sql=false --location=me-west1 < shop-mart.sql
```

It replaces the four tables, so it is safe to run again. The two copies must stay the same rows.
After changing a formula in either file, run this on both and compare — every value must match:

```sql
SELECT COUNT(*), COUNT(DISTINCT order_id), MIN(date_key), MAX(date_key),
       ROUND(SUM(CASE WHEN status <> 'pending' THEN quantity * unit_cents END) / 100.0, 2),
       SUM(customer_key), SUM(product_key), SUM(quantity)
FROM fact_sales;   -- shop_mart.fact_sales in BigQuery; SET search_path = mart in Postgres
```

On 2026-11-22 both gave `1666665, 555555, 20240101, 20251125, 259563950.13, 83334106935,
8334173669, 4999995`.

Whoever queries it needs `roles/bigquery.jobUser` on the project and `roles/bigquery.dataViewer` on
the dataset.

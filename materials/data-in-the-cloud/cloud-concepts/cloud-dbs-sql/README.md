# Cloud Data Services vs On-Prem Databases

You already query databases for a living, and you know what a warehouse *is* — a separate store,
modelled for the question, with facts, dimensions and a grain. This module is about what changes when
that warehouse moves to the **cloud**, and, just as important, when it shouldn't.

It compares the **on-prem relational databases** you use today (Oracle, PostgreSQL) with the **managed
databases** and **cloud analytics services** (BigQuery, Amazon Athena, Redshift) that a BI developer
increasingly meets, and gives you a clear basis for choosing between them.

The spine is the architectural idea the cloud made mainstream — **separating storage from compute** —
and the two consequences that fall out of it: a table you lay out so a query reads less, and a bill
that charges you for the bytes it read. Once those click, the landscape of services stops being a pile
of brand names and becomes a small set of patterns.

It builds on **Data Warehousing** (the OLTP/OLAP split, the star schema, the grain and history) and on
**Cloud Concepts** (service models, deployment, governance).

## What you'll learn

| # | Lesson | Idea |
|---|---|---|
| 01 | On-prem RDBMS vs managed relational | Oracle/Postgres you run vs RDS/Cloud SQL someone runs for you — and what it does *not* fix |
| 02 | Storage and compute separation | The cloud pivot: data rests in cheap object storage, stateless compute spins up per query |
| 03 | Partitioning and clustering | Lay an analytical table out so a `WHERE` reads a slice, not everything (live in BigQuery) |
| 04 | The scan-based cost model | Why billing moved to bytes-scanned + compute-used, and the levers you control (live in BigQuery) |
| 05 | Cloud warehouses & query services | The product map: BigQuery, Redshift, Snowflake, Athena — warehouses vs query-over-lake |
| 06 | Choosing the right store | A decision framework — and when on-prem still wins |
| 07 | Governance & security for cloud analytics | Row/column-level security, masking, authorized views, audit logs, CMEK |

**Total: ~1.3h (intro) to ~2.7h with the mechanics and governance depth.**

```{note}
Mostly a theory module, but lessons 03–04 include a **live BigQuery hands-on** (a shared project over a
public dataset) where you watch partition pruning and column projection change the bytes-scanned — and
therefore the cost — of a query in real time.
```

# Columnar Storage & MPP

An aggregation over a whole table is a scan, and an index speeds up finding a few rows, not reading
all of them. This module explains what does make that query fast — storing data by column, encoding
each column, executing on batches of values, and spreading one scan across many machines — and
measures each cause separately.

## What you'll learn

| # | Lesson | Idea |
|---|---|---|
| 01 | The Wall | An aggregation is a scan, and no index shortens it |
| 02 | Columns on Disk | The same table as records and as one array per column |
| 03 | Encoding and Compression | Why a column shrinks, and why sort order decides by how much |
| 04 | Inside a Parquet File | Row groups, the footer, and the statistics that let a reader skip |
| 05 | Executing on Columns, and the Price | Batches instead of rows; what writes and lookups pay |
| 06 | MPP: One Scan on Many Machines | Partition, parallel scan, shuffle, aggregate |
| 07 | The Honest Comparison | The speedup, cause by cause; table formats; choosing a store |

```{note}
🚧 Scaffold module — the learning path is settled in `module.yml`; the pages are not written yet.
```

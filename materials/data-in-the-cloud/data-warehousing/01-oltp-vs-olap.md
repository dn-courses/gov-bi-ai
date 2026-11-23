# OLTP vs OLAP

You already have a database, and it works. So before any talk of warehouses, start with the question
that decides everything downstream: **what is this database for?** Almost every difference between the
operational database that runs an application and the analytical store a reporting team asks for
traces back to a single split — is the system built to **record transactions** or to **answer
analytical questions**? Name the workload first, and the right *design* follows from it.

This lesson establishes that split. It is the fork in the road the rest of the module is built on:
once you accept that one store cannot serve both jobs well, everything after is about designing the
second one.

## Two workloads, pulling in opposite directions

Picture two real jobs your systems do.

The first is the **records system**: a rider unlocks a bike, so one row is written; a support agent
pulls up account 4471829 and updates an address. Thousands of these happen a minute, each touching
**one row** (or a handful), each needing to finish in milliseconds. The job is to record what is
happening, correctly, under heavy concurrency — and to hold **what is true right now**. This is
**OLTP** — online transaction processing.

The second is the **report**: "total ride minutes by station, by month, for the last three years."
One query, but it sweeps **millions of rows** and aggregates them. Nobody updates a single row; the
data arrived in a batch and is now read, hard, by dashboards. The job is not to record anything — it is
to **answer a question**, usually about a stretch of the past. This is **OLAP** — online analytical
processing.

```{note}
The names are old and a little clinical, but the split is the whole game. OLTP = record what is
happening now, one transaction at a time. OLAP = answer questions about what happened, a whole set at
a time.
```

The two jobs disagree about almost everything that matters when you design a schema:

| | OLTP — record the transaction | OLAP — answer the question |
|---|---|---|
| **Unit of work** | one row, or a handful | millions of rows, aggregated |
| **What the data is** | current state | history, kept on purpose |
| **Written by** | the application, constantly | a scheduled load |
| **Schema is shaped for** | correct concurrent writes — so, normalized | the question — so, few joins, wide dimensions |
| **A change to a row means** | overwrite it; the old value is gone | a decision: overwrite, or keep both versions |

That last row is the one that bites, and the slowly-changing-dimensions lesson is devoted to it. But
look at the column
headed *schema is shaped for*: the split is not really about machines. **It is about what you model,
and for whom.** Two honest designs of the same world disagree because they are answering different
questions — and no amount of tuning turns one into the other.

```{mermaid}
flowchart LR
  subgraph oltp["OLTP — the records system"]
    a1["unlock a bike, write 1 row"]
    a2["fetch account 4471829"]
    a3["update an address"]
  end
  subgraph olap["OLAP — the report"]
    b1["ride-minutes by station<br/>by month, 3 years"]
    b2["aggregate over years<br/>of history"]
  end
  oltp -->|"many tiny, latency-sensitive"| store1[("modelled for<br/>the transaction")]
  olap -->|"few huge, throughput-bound"| store2[("modelled for<br/>the question")]
```

## The failure mode: hunting for "the fastest database"

The trap is to ask "which database is fastest?" and shop for a winner. There isn't one. "Fastest" is
meaningless without a workload attached — an engine tuned for single-record lookups loses badly at
million-row aggregations, and the reverse. The only real question is **fit between the workload and the
store.**

And note where that leaves you: shopping is the *second* question, and usually not the interesting one.
A report that re-derives six joins over a schema built for writes is slow because of how it was
**modelled**, and buying a bigger engine does not fix a modelling problem — it just pays more per
query to keep having it.

```{tip}
This is why so many shops run **both**: an OLTP database for the operational, record-at-a-time traffic,
and an analytical store for the reporting. They are not competitors to choose between; they are two
tools for two workloads. This module is about the OLAP side — but it never asks you to give up the
OLTP one.
```

## A note on storage layout

```{note}
You may have heard the OLTP/OLAP split explained as *row storage versus columnar storage*. Physical
layout is real — an analytical engine can store each column together and skip the ones you did not ask
for — but it is a downstream **implementation** choice, not what the split *is*, and it is not this
module's subject. Columnar storage and MPP get their proper treatment in the **massively-parallel
processing module**. Everything the rest of this module teaches — facts, a grain, versioned history —
is modelling, and runs perfectly well on an ordinary row store like Postgres.
```

## Key takeaways

- The first question is the **workload**, not the vendor: **OLTP** records what is happening now, one
  transaction at a time; **OLAP** answers questions about what happened, a whole set at a time.
- The split shows up first in **what you model** — current state versus kept history, normalized for
  writes versus shaped for the question. That is why many shops run an OLTP database *and* an
  analytical store side by side.
- There is **no "fastest database"** — only fit between workload and store. And a report that is slow
  because of its *model* does not get faster on bigger hardware.
- **Row versus columnar storage is not the point.** It is one implementation of the analytical side,
  covered in its own module. A genuine warehouse can be — and in this module is — built on a row store.

**Next:** A warehouse is an architecture, not a product

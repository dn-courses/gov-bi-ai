# Star and snowflake

You have a fact, some dimensions, and a grain. Now put them together, and one shape appears so
reliably that it has a name.

Put one fact table in the centre and surround it with the dimension tables it references by key. The
fact is the hub; the dimensions are the points. That is a **star schema**, and it is the default shape
of every warehouse you will meet.

```{mermaid}
flowchart TB
  fact["FACT: ride<br/>grain: one row per ride<br/>start_station_key · date_key · rider_type_key<br/>duration_seconds · distance_meters"]
  dimstation["DIM: station<br/>station_key<br/>name · capacity<br/>neighbourhood · city · region"]
  dimdate["DIM: date<br/>date_key<br/>full_date · month · quarter · year"]
  dimrider["DIM: rider type<br/>rider_type_key<br/>label"]
  dimbike["DIM: bike<br/>bike_key<br/>model · is_electric"]
  dimstation --> fact
  dimdate --> fact
  dimrider --> fact
  dimbike --> fact
```

Every query has the same shape as the diagram: measures from the middle, groupings from the points,
**exactly one join hop** between them.

```sql
SELECT s.neighbourhood,
       d.month,
       COUNT(*)                AS rides,
       SUM(f.duration_seconds) AS ride_seconds
FROM fact_ride  f
JOIN dim_station s ON s.station_key = f.start_station_key
JOIN dim_date    d ON d.date_key    = f.date_key
GROUP BY s.neighbourhood, d.month;
```

Read it against the shape: one hop to each point, never point-to-point. An analyst does not need to
know how the operational system nests its geography — they need to know that `neighbourhood` is a
column on `dim_station`.

## The other shape: snowflake

Look hard at `dim_station`. It holds `neighbourhood`, `city` and `region`, and those repeat: every
station in Cambridge repeats "Cambridge", and every Cambridge row repeats "Massachusetts". Your
normalising instinct — the correct one, in an operational database — screams to fix it:

```{mermaid}
flowchart LR
  fact["FACT: ride"] --> dimstation["DIM: station<br/>station_key · name · capacity<br/>neighbourhood_key"]
  dimstation --> dimnb["neighbourhood<br/>neighbourhood_key · name<br/>city_key"]
  dimnb --> dimcity["city<br/>city_key · name<br/>region_key"]
  dimcity --> dimregion["region<br/>region_key · name"]
```

That is a **snowflake schema**: dimensions normalized into sub-tables, so each attribute is stored
exactly once. It is not wrong. It is a perfectly sound relational design. It is also, in a warehouse,
usually the wrong trade — and knowing *why* is the point of this lesson.

## Denormalisation on purpose

The instinct to normalize exists for good reasons, and they are all about **writes**:

- **Update anomalies.** If "Cambridge" is spelled in 200 station rows and the city is renamed, you must
  update 200 rows, and if you miss one you now have two cities.
- **Storage.** Storing "Massachusetts" once beats storing it 40,000 times.

Now ask whether either reason applies to a warehouse.

**The update anomaly is not a risk, because nobody updates a warehouse by hand.** The dimension is
*loaded*, by a pipeline, from a source. If the city is renamed, the pipeline rewrites the rows. There
is no user typing into `dim_station`, so there is no anomaly to prevent. The very thing normalization
protects — many uncoordinated writers — does not exist here.

**The storage saving is negligible, and you pay for it in joins.** `dim_station` has a few thousand
rows. Duplicating a city name across them costs kilobytes. Meanwhile every report pays for the
normalization forever: three extra joins, on every single query, run thousands of times a day.

That is the trade, and stated plainly it is not close:

| | Star | Snowflake |
|---|---|---|
| Joins per report | 1 hop per dimension | 1 + one per level of nesting |
| Dimension storage | some redundancy (kilobytes) | minimal |
| Who can read it | anyone: "group by `dim_station.city`" | you must know the chain of tables |
| Update anomalies | prevented by the **load**, not the schema | prevented by the schema |
| Where the bytes actually are | the fact table — unaffected either way | the fact table — unaffected either way |

The last row is the one people miss. The fact table is 99.9% of the data. **How you shape the
dimensions barely touches total storage at all** — so you are trading a rounding error in bytes for a
real cost on every query. Denormalise the dimension, deliberately, and write it down as a decision
rather than an accident.

```{important}
**Denormalisation is not sloppiness; it is a trade you make on purpose.** In an OLTP schema you
optimise for correct, cheap, concurrent *writes*. In a warehouse you optimise for simple, fast, endless
*reads*, and the write side is a controlled, single-writer pipeline. Same data, opposite shape, because
the workload is opposite.
```

```{tip}
When does a snowflake still earn its place? When a sub-table is genuinely **huge and shared** (a
product hierarchy with millions of rows behind a small dimension), or when a level of the hierarchy is
itself something you must load and version independently. Both are rare. Start with a flat star and
snowflake only when you can name the specific pain it removes.
```

## Conformed dimensions: the same "station" everywhere

A warehouse has more than one fact. Meridian has rides (one row per ride) and station status (one row
per station per minute). Two facts, two grains, and both are sliced by *station*.

If each fact gets its own private station table, you get two definitions of "station" — with different
spellings, different keys, and a different idea of which stations count as active. Then someone asks
"which stations are busy but empty?", tries to join across the two, and the numbers do not reconcile.
That question is now unanswerable, and no one is quite sure why.

A **conformed dimension** is a single dimension table shared by every fact that needs it:

```{mermaid}
flowchart TB
  dimstation["DIM: station<br/>ONE table, ONE key, ONE definition"]
  factride["FACT: ride<br/>grain: one row per ride"]
  factstatus["FACT: station status<br/>grain: one row per station per minute"]
  dimstation --> factride
  dimstation --> factstatus
```

Because both facts carry the *same* `station_key`, "rides by neighbourhood" and "empty minutes by
neighbourhood" can be put side by side and *mean* the same thing. Conformance is what makes a warehouse
one warehouse rather than a pile of unrelated marts — and it is a *modelling* decision, taken early,
that nothing downstream can retrofit. This is a first look; the conformed-dimensions lesson later scales
it to many facts and introduces the **bus matrix** that plans them across a whole enterprise.

```{warning}
The commonest way this is lost: a team builds a second star for a new report in a hurry, re-loading
its own `stations` table because it is faster than agreeing on the shared one. Six months later the two
tables disagree about which stations are active, both dashboards are "right", and the meeting to
reconcile them costs more than the second star ever saved.
```

## Key takeaways

- A **star schema** is one fact table surrounded by its dimensions, joined in exactly one hop. Every
  report has the same shape: measures from the fact, groupings from the dimensions.
- A **snowflake** normalizes dimensions into sub-tables. It is sound relational design and, in a
  warehouse, usually a bad trade: more joins on every query, to save storage in the tables that hold
  almost none of the data.
- **Denormalise the dimension on purpose.** Normalisation defends against update anomalies from many
  concurrent writers; a warehouse dimension has exactly one writer — the load.
- The fact table holds ~all the bytes, so dimension redundancy is a rounding error while dimension
  joins are a cost paid on every query, forever.
- **Conformed dimensions** — one `dim_station`, shared by every fact — are what let two facts be
  compared at all. It is a decision taken up front; nothing downstream can retrofit it.

**Next:** Slowly changing dimensions

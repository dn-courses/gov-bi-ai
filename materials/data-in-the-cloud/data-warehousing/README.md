# Data Warehousing & Dimensional Modeling

Someone asks for a report. You write the `SELECT` against the production database, and it works. Then
it grows a `GROUP BY`, then three years of history, then a schedule — and one morning the application
is slow and nobody can say why.

This module is what you do instead. It teaches the **warehouse**: a separate store, loaded from the
operational systems, whose schema is modelled for **the questions people ask** rather than for the
transactions an application performs. And it teaches the model that lives inside it — facts,
dimensions, the grain, and history — because a warehouse is not something you buy. It is something you
*shape*.

## The one thing to unlearn first

A warehouse is **an architecture, not a product**, and it is not a kind of database you have to go and
buy. A relational engine can serve either workload — the same SQL, the same joins; what makes one
system operational and the other analytical is **the schema you put in it**. Dimensional modelling was
published in 1996 and ran for years on the ordinary relational databases everyone already had. So the
warehouse you design here — a star, a stated grain, versioned history — is a plain **Postgres** schema.
Dedicated analytics platforms are an optimisation you buy later; they run the same model, unchanged,
and they are a different module's subject.

## Three parts

**Why a warehouse exists.** The OLTP/OLAP split: two workloads that want opposite things from one
store, and why the answer is never "find the fastest database". Then the architecture — why the report
cannot live on the operational store, what a warehouse actually owes you, and the misconception worth
killing early: a warehouse is not a product you buy. What you run it *on* is a separate question, and
it is not this module's.

**The model.** Facts and dimensions — and **the grain**, the single most important decision you will
make: *"one row per ___"* is a contract that fixes the primary key and defines what a duplicate *is*.
Then measures that are additive, semi-additive and non-additive; natural versus surrogate keys; star
versus snowflake and denormalisation on purpose; and **slowly changing dimensions**, where you decide —
deliberately, per attribute — whether a station's rename rewrites last March's report or leaves it
standing.

**Designing with the model.** The part where it stops being definitions. One real dataset modelled
**twice**, operational store beside warehouse, landing on the insight the rest of the module leans on:
the operational store keeps current state only, so history has to be captured on purpose or it never
exists. Then the three fact-table types — transaction, periodic snapshot, accumulating snapshot — and
aggregation tables, including what a pre-computed answer costs you. Finally conformed dimensions and
the **bus matrix**: the whole enterprise's warehouse plan on one page.

## What you'll learn

- Why one store cannot serve two workloads, and what a report does to the database an application needs
- A warehouse is an architecture, not a product — the schema makes it one, not the engine under it
- **Facts, dimensions and the grain** — the contract that fixes the key and defines the duplicate
- Additive, semi-additive and non-additive measures, and why you never store a ratio
- Natural keys, surrogate keys, and the wrong number that appears when you confuse them
- Star versus snowflake, and denormalising a dimension on purpose
- **Slowly changing dimensions**: Type 1, Type 2 and Type 3 — history as a decision, made per attribute
- The effective-date pattern, "as of" queries, and a rename that leaves March's report intact
- One dataset modelled twice — and why the history exists only if something captures it
- Transaction, periodic-snapshot and accumulating-snapshot facts, and when each is the right shape
- Aggregation tables: the summary grain, incremental versus full rebuild, and what pre-computing costs
- **Conformed dimensions and the bus matrix** — how separate stars add up to one warehouse

## How you practise

The lessons are design work: every one of them makes you choose — a grain, a shape, a history policy —
and shows you the wrong number that follows from choosing badly. **Two designs for one dataset** is the
pivot, where a single bike-share dataset gets modelled twice and the two schemas sit side by side.

A capstone exercise is being authored: you will take the whole module — grain, star, SCD2, measure
types — to a domain you have not seen, with a set of analysis questions as the acceptance test for your
model. One of those questions cannot be answered by a Type 1 dimension: it returns a *wrong number*,
not an error.

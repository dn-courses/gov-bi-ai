# Governance and Security for Cloud Analytics

The cloud-concepts module already settled the *general* rules: where data may physically live
(residency), who owns the obligations when you move to the cloud (shared responsibility), that
data is encrypted, and that access follows least privilege. Those rules tell you a dataset is
*allowed* on a given service in a given region. They do not tell you the next thing a BI developer
actually has to build: once the data is sitting in the warehouse, **who gets to see which rows,
which columns, and what gets written down when they look.**

That is this lesson — the data-service-specific layer. Every control here is a *knob the warehouse
itself exposes*, not a cloud-wide policy. We use BigQuery as the concrete engine (it is the
module's lab), but name the equivalents in Snowflake and Redshift as we go, because the *model* is
portable even though the syntax is not.

## The access-control model: layers, narrowing down

Think of warehouse access control as a stack of filters a query passes through, each narrower than
the last. A principal must clear **every** layer; any one of them can take data away.

```{mermaid}
flowchart TB
  q["A principal runs a query"] --> iam
  iam["IAM: may you touch this dataset / table at all?"] --> rls
  rls["Row-level security: which rows may you see?"] --> cls
  cls["Column-level security: which columns may you read?"] --> mask
  mask["Dynamic masking: of the columns you can read,<br/>which come back obscured?"] --> result["The rows and columns that survive every layer"]
```

Reading the stack top to bottom: **IAM** decides whether you can address the object at all;
**row-level security** drops rows you are not entitled to; **column-level security** removes whole
columns; **dynamic masking** keeps a column present but returns obscured values. An **authorized
view** (later) is a different shape — it lets a query reach data the *caller* has no IAM grant for,
by lending the view's own identity. Hold this stack in mind; the rest of the lesson is one layer at
a time.

```{note}
This is *least privilege* (from cloud-concepts) made operational. The concept says "grant the
minimum." These knobs are *how* you express "the minimum" precisely — not "all of `salaries`" but
"the rows for your department, with the national-ID column masked." Same principle, warehouse-native
controls.
```

## Layer 1 — Dataset and table IAM

In BigQuery the unit you grant access on is usually the **dataset** (a container of tables), and you
can go finer to the **table or view**. You attach an IAM **role** — `roles/bigquery.dataViewer`
(read), `roles/bigquery.dataEditor` (read/write) — to a **principal**: a human user, a group, or a
**service account**.

The distinction that trips up teams new to the cloud is **service account vs user**. A user
identity is a person logging in. A **service account** is a non-human identity that an automated
job runs *as* — the nightly load that builds your fact table, the scheduled query behind a
dashboard. The rule of thumb:

- Grant **groups**, not individuals, where you can — membership changes are then an IAM-free
  personnel task, not a re-grant.
- Give **service accounts** only the access their job needs, and prefer a *distinct* service account
  per job, so a compromised pipeline can't read everything.

```{warning}
Granting at the wrong granularity is the most common over-share. Giving a reporting group
`dataViewer` on a whole *project* hands them every dataset in it, forever, including ones created
later. Grant on the **dataset** (or table) that the report actually needs. The finer layers below
only help if this coarse layer wasn't already too generous.
```

Snowflake expresses the same idea through roles and grants on databases/schemas/tables; Redshift
through `GRANT` on schemas and tables. The vocabulary differs; "a role, granted to a principal, on
an object" does not.

## Layer 2 — Row-level security

IAM is all-or-nothing per object: you can read the table, or you cannot. **Row-level security
(RLS)** narrows *within* a table — different principals querying the same table see different rows.
The classic government case: one `case_files` table, and each regional office may see only its own
region's rows.

In BigQuery you express this as a **row access policy** — a named, SQL-like rule on the table:

```sql
-- Eastern-region analysts see only Eastern rows
CREATE ROW ACCESS POLICY eastern_only
ON dataset.case_files
GRANT TO ("group:eastern-analysts@agency.gov")
FILTER USING (region = 'EAST');
```

The `FILTER USING` clause behaves like a `WHERE` that the engine silently `AND`s onto every query
the grantees run against that table. Two behaviors you must internalize:

- **Multiple policies are a *union*.** If a principal is a grantee on more than one policy, they see
  the rows matching *any* of their policies — the filters are OR-ed together. So you compose access
  by adding policies, not by editing one.
- **A row policy is also a wall.** The moment a table has *any* row access policy, a principal who
  is **not** a grantee on at least one policy sees **no rows at all**. Adding the first policy to a
  previously open table silently locks out everyone you didn't list — including the people who used
  to query it freely. Add a `FILTER USING (TRUE)` policy for the groups that should keep full
  access.

```{tip}
RLS is the warehouse-native version of the on-prem pattern where you hand each office its own view
or its own schema. The difference: it's one table with one policy set, enforced by the engine, so
there is no per-office view to keep in sync and no way to "accidentally" query around it. Snowflake
calls the equivalent a *row access policy* too; Redshift calls it *row-level security policies*.
```

## Layer 3 — Column-level security

RLS hides rows; **column-level security (CLS)** hides *columns*. The salary column, the national-ID
column — present in the table, but only certain roles may read them. BigQuery does **not** do this
with a per-column grant. It does it with **policy tags**, and the mechanism is worth getting right
because it is the same machinery masking uses next.

The flow:

1. You create a **taxonomy** — a hierarchy of **policy tags** — in **Dataplex / Data Catalog** (for
   example a tag `pii/national_id` under a `pii` parent).
2. You **attach** a policy tag to a column in the table's schema. The column is now governed by that
   tag, not by an ACL of its own.
3. You grant the **Data Catalog Fine-Grained Reader** role (`datacatalog.categoryFineGrainedReader`)
   on the tag to whoever may read those columns.

A principal **with** the tag's Fine-Grained Reader role reads the column normally. A principal
**without** it cannot — and the failure mode is specific and worth predicting:

```sql
-- national_id carries a restricted policy tag; the caller lacks Fine-Grained Reader

SELECT * FROM dataset.employees;
-- ❌ ERROR — the query is rejected and the error names the column(s) you may not read

SELECT name, department FROM dataset.employees;   -- avoids the tagged column
-- ✅ runs fine
```

This is why `SELECT *` is doubly punished in a governed warehouse: lesson 04 showed it wastes
**bytes** (and money) reading every column; here it *fails outright* if any column is tag-restricted.
Naming the columns you need — already good cost hygiene — is also how you coexist with CLS.

```{note}
CLS is enforced *in addition to* dataset IAM: the caller needs **both** `dataViewer` on the dataset
**and** Fine-Grained Reader on the tag. The layers compose; a column is readable only when every
layer that governs it says yes. Snowflake and Redshift both offer column-level grants for the same
goal; BigQuery's tag-based design is what lets one taxonomy govern columns across *many* tables at
once.
```

## Layer 4 — Dynamic data masking

CLS is binary: you read the column or you are blocked. Often you want a *middle* setting — let a
broad audience query the table, but show them an **obscured** value for the sensitive column instead
of the real one. That is **dynamic data masking**, and the key property is in the word *dynamic*:
the masking happens **at query time, on the same stored bytes**. There is no second, redacted copy
of the table to build, secure, and keep in sync — the original data is untouched and the transform
is applied per-caller as the query runs.

Masking is **built on the same policy tags as CLS**. You attach a **data policy** to a tag, choosing
a masking rule, and grant the **Masked Reader** role (`bigquerydatapolicy.maskedReader`) to the
audience that should see masked values. The roles then sort callers into three tiers on the same
column:

| Role the caller holds on the tag | What they see in the masked column |
|---|---|
| Data Catalog **Fine-Grained Reader** | the real, unmasked value |
| **Masked Reader** | the value transformed by the masking rule |
| neither | blocked — column-level security denies the column |

BigQuery ships a set of masking rules; useful ones for BI work include **Nullify** (returns `NULL`),
**Default masking value** (a type-appropriate blank — empty string, `0`), **Hash (SHA-256)** (a
stable hash, so the same input always masks to the same token and rows can still be *joined* or
*counted* on it without revealing the value), **Email mask**, and **Last four characters** (show the
last four, mask the rest — the familiar `XXXXX1234`).

```{tip}
The SHA-256 rule is the one that makes masking *analytically* useful, not just safe. A masked
`citizen_id` still hashes consistently, so an analyst can `COUNT(DISTINCT citizen_id)` or join two
tables on it to link records — getting the aggregate answer — while never seeing an actual ID.
That's the whole pitch of dynamic masking for government BI: broaden who can run the report without
broadening who can read the raw identifiers.
```

## Authorized views: brokering access without the grant

The four layers narrow what a principal *who has IAM access* may see. An **authorized view** solves
the opposite problem: letting someone query a curated slice of a table they have **no access to at
all**.

Normally a view in BigQuery runs with the *caller's* permissions, so the caller would still need
read access on the underlying tables — defeating the point. An **authorized view** is a view that
the source dataset has explicitly **authorized**: the view is granted read access to the source, and
it runs queries using *its own* identity, not the caller's. So you give consumers access to the
**view's** dataset only; the view reaches through to the source on their behalf and returns just the
columns and rows its `SELECT` exposes.

```{mermaid}
flowchart LR
  consumer["Reporting team<br/>(no access to source)"] -->|"dataViewer on the view"| view
  view["Authorized view<br/>SELECT region, SUM(amount)<br/>FROM raw.case_files<br/>GROUP BY region"]
  view -.->|"runs as itself,<br/>authorized on the source"| source[("raw.case_files<br/>(restricted)")]
  source -.->|"only the view's<br/>aggregated output"| view
  view --> result["Region totals only —<br/>never the raw rows"]
```

The view lives in a **separate dataset** from the source (the two must be in the same region), and
"authorizing" it just means adding the view to the source dataset's access list. The consumer can
run the view and nothing else — they cannot read `raw.case_files` directly, cannot widen the
`SELECT`, cannot see the columns the view left out.

```{note}
Authorized views are the warehouse's answer to "I need to publish a safe, aggregated slice of
sensitive data to a wide audience" — a curated reporting layer over a restricted base. BigQuery also
offers **authorized datasets** (authorize a whole dataset of views at once) and **authorized
routines** (the same brokering for a stored procedure or function). Snowflake's *secure views* and
Redshift's late-binding views over restricted tables serve the same brokering role.
```

## Data-access audit logs: who queried what

Every control above decides what a principal *can* do. Audit logs answer the question a government BI
team is eventually, non-negotiably asked: **who actually queried this data, and when?** Not "who
*could* have" — who *did*.

BigQuery's activity flows into **Cloud Audit Logs**, which come in distinct streams:

| Log type | Records | Default |
|---|---|---|
| **Admin Activity** | config changes — create/alter/delete a table, change an IAM grant | always on, can't be disabled |
| **Data Access** | data reads/writes — *who ran which query, against which tables* | **on for BigQuery** (the exception) |
| **System Event** | Google-initiated system changes | always on |
| **Policy Denied** | access blocked by a security policy | always on |

The one that matters here is **Data Access**, and BigQuery is special: Data Access logs are
*disabled by default for almost every other Google Cloud service* (they can get huge), **but for
BigQuery they are written by default and cannot be turned off**. So the record of who-queried-what
exists for your warehouse whether or not anyone remembered to switch it on — exactly the guarantee a
compliance regime wants. A Data Access entry carries the principal's identity, the query text, the
tables touched, and the timestamp.

```{tip}
There are two complementary views of "who queried what." `INFORMATION_SCHEMA.JOBS` (from lesson 04,
where you used it for *bytes scanned*) is the convenient SQL-queryable rollup of recent jobs —
great for self-service. The **Cloud Audit Logs** Data Access stream is the durable, exportable,
tamper-evident record built *for governance*: route it to a log sink for long retention and you have
the evidence trail an audit asks for. Same events, two purposes — operational visibility vs. the
official record.
```

## CMEK: holding your own keys

The last knob ties back to a cloud-concepts theme without re-teaching it. cloud-concepts established
that warehouse data is **encrypted at rest** and that *who holds the keys* is a sovereignty question.
The warehouse-specific control that answers it is **CMEK — customer-managed encryption keys.**

By default BigQuery encrypts everything with Google-managed keys; you never see them. With CMEK you
instead supply a key you own in **Cloud KMS**, and BigQuery uses *your* key to wrap the keys that
encrypt your data. The control this buys is concrete: because every read must call your KMS key to
decrypt, **disabling or revoking that key makes the data immediately unreadable — to everyone,
regardless of their IAM grants.** A principal with full `dataViewer` still gets nothing once the key
is off; re-enabling the key restores access. You hold a kill-switch the cloud provider does not.

```{note}
CMEK is a *store-selection and configuration* constraint of the kind cloud-concepts framed under
sovereignty — reach for it when a data classification or legal regime requires that *your*
organization, not the provider, can unilaterally cut off access to the bytes. It is not free
complexity: you now own key rotation and the operational risk that a fat-fingered key disable takes
your warehouse offline. Use it where the sovereignty requirement is real, not by reflex. Snowflake's
*Tri-Secret Secure* and Redshift's KMS CMEK are the equivalents.
```

## Residency: where this all sits

Finally, the tie-back the scope demands: none of these controls choose *where* the data lives.
**Residency** — which region a dataset is created in, and therefore which jurisdiction's law governs
it — is settled in cloud-concepts and is a **store-selection constraint** you resolve *before* you
reach this lesson. It shows up here only as a boundary the warehouse controls must respect: an
authorized view must sit in the **same region** as its source; a CMEK key lives in a region you
choose. Pick the region for residency first (cloud-concepts); then layer these access controls on
top.

### Exercises

These are reasoning-and-design exercises — no live GCP credentials needed. You check your own work
by whether your access reasoning holds and your design meets the stated requirement. Work them in
order; each leans on the layer model from the top of the lesson.

1. **Predict who sees what.** A `payroll` table has a row access policy
   `GRANT TO ("group:hr-east@agency.gov") FILTER USING (region = 'EAST')`, and its `national_id`
   column carries a policy tag whose Fine-Grained Reader role is held only by `group:hr-leads`. A
   member of **`hr-east` who is not an `hr-lead`** runs `SELECT * FROM payroll`. Predict what
   happens — does the query run, and if so which rows and columns come back? Name the specific layer
   that produces each part of your answer.

   :::{hint}
   :class: dropdown
   Walk the stack: IAM (assume they have `dataViewer`) → RLS (are they a grantee? which rows?) →
   CLS (do they hold Fine-Grained Reader on the tagged column?). One of those layers turns
   `SELECT *` into an *error* rather than a filtered result — which, and why?
   :::

2. **Pick the right column control.** A `citizens` table has a `national_id` column. Two reporting
   needs land on your desk: (a) the fraud team must `COUNT(DISTINCT national_id)` and join `citizens`
   to a benefits table on that id, but must **never** see a real id; (b) a junior dashboard team must
   not see the column *at all*. Decide, for each team, whether you reach for **column-level
   security** or **dynamic data masking** (and if masking, which *rule*), and justify why the other
   choice fails that team's requirement.

   :::{hint}
   :class: dropdown
   Which control lets a value still *function* in a `JOIN`/`COUNT DISTINCT` while hiding the real
   value? Which control is the binary "block the column" one? Map each requirement to the control
   whose behavior matches it exactly.
   :::

3. **Design an authorized view.** A `raw.case_files` table holds sensitive per-citizen rows. A
   public-facing transparency team needs *only* per-region case counts — never individual rows, and
   they must have **no** access to `raw.case_files`. Describe the objects you would create and the
   grants you would make so that team can run their report and nothing else. State exactly why they
   cannot widen the query to expose raw rows, in terms of *whose identity* the view runs as.

   :::{hint}
   :class: dropdown
   Three pieces: a separate dataset for the view, the view's `SELECT` (what does it aggregate?), and
   the two grants — one *authorizing the view on the source*, one giving the team `dataViewer` on the
   *view's* dataset only. The team never gets a grant on `raw.case_files` — so what stops a
   widened `SELECT`?
   :::

4. **Reason about an audit investigation.** Six months ago, someone queried a restricted citizen
   table they should not have been able to. You are asked to prove *who* did it and *when*, and also
   to explain how it was even possible. (a) Which log stream holds the who/when, and why is it
   reliably present for BigQuery even if no one configured logging? (b) The query *succeeded*, yet
   the table had a row access policy — give two distinct ways access could have been mis-granted such
   that the query was allowed (think back across all the layers, including the brokering one). (c)
   For long-term governance, why would you route this log stream to a sink rather than rely on
   `INFORMATION_SCHEMA.JOBS`?

   :::{hint}
   :class: dropdown
   (b) is the conceptual finale: the layers are AND-ed for restriction, but access could leak if a
   layer was *opened* — e.g. a `FILTER USING (TRUE)` policy, an over-broad IAM grant on the dataset
   or project, or an **authorized view** that ran as an over-privileged identity and handed rows
   through. Each is a different layer failing open.
   :::

## Key takeaways

- Warehouse access control is a **stack of layers** a query must clear: IAM (touch the object) →
  row-level security (which rows) → column-level security (which columns) → dynamic masking (obscure
  values). A principal sees only what survives **every** layer.
- **IAM** grants a *role* to a *principal* (user, group, or **service account**) on a dataset or
  table; grant at the **right granularity** — a project-wide grant over-shares every dataset, now
  and future.
- **Row-level security** (`CREATE ROW ACCESS POLICY … FILTER USING …`) restricts rows per principal;
  multiple policies are a **union**, and the first policy on a table **locks out** anyone not listed.
- **Column-level security** uses **policy tags** (a Dataplex/Data Catalog taxonomy) + the
  **Fine-Grained Reader** role; a blocked column makes `SELECT *` *error*, so name your columns.
- **Dynamic data masking** reuses those policy tags to return **obscured values at query time on the
  same bytes** (no redacted copy); the **Masked Reader** role sees the mask, **Fine-Grained Reader**
  sees the real value — and the SHA-256 rule keeps a value joinable/countable while hidden.
- **Authorized views** broker access: the view runs as **its own identity** against a source the
  consumer can't touch, exposing only its curated `SELECT`. Authorized datasets/routines generalize
  it.
- **Cloud Audit Logs → Data Access** records *who queried what, when*, and is **on by default and
  un-disable-able for BigQuery** — the governance evidence trail; route it to a sink for retention.
- **CMEK** puts the encryption key in *your* Cloud KMS; **disabling the key makes the data
  unreadable to everyone regardless of IAM** — a sovereignty kill-switch, with the operational cost
  of owning the key.
- **Residency** is a cloud-concepts **store-selection constraint** decided *before* this layer; it
  only bounds these controls (same-region authorized views, regional keys), it is not re-decided
  here.

**Next:** [Back to the module overview](README.md)

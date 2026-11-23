// cdb-map — the product map: a warehouse owns its storage, a query service reads files where they
// sit, open table formats are joining the two, and the products differ in what they bill and where
// they run. Product facts are from the providers' documentation, checked 2026-11 (the fact-check
// report for this module); no number here is a measurement of ours.
import { arrow, box, extra, on, pill, t, widget, zone } from "./cdb-lib.js";

const WAREHOUSES = [["BigQuery", "Google · no cluster to see"], ["Redshift", "AWS · serverless or a cluster"], ["Snowflake", "on AWS, Google or Azure"], ["Fabric", "Azure · follows Synapse"]];
const OVER_LAKE = [["Athena", "AWS · SQL over files in S3"], ["BigQuery", "external and BigLake tables"], ["Redshift", "reads the lake in place too"], ["Snowflake", "external tables"]];
const ICEBERG_L = [["BigQuery", "Iceberg managed tables"], ["Snowflake", "Iceberg tables"]];
const ICEBERG_R = [["S3 Tables", "AWS · Iceberg, kept compact"], ["Fabric", "all tables stored as Delta"]];

const steps = () => [
  { stop: "Load it in", title: "A warehouse: the data is loaded into the service",
    note: `The service stores the table in its own columnar format and owns the layout. That ownership is what lets it partition the table, cluster it and skip what a query does not need.` },
  { stop: "In place", title: "A query service: SQL over the files where they sit",
    note: `The data stays as files in your own object storage — a <b>data lake</b> — and the service runs SQL directly over them. Nothing is loaded first, and other tools can read the same files.` },
  { stop: "Which", title: "Often both",
    note: `Load in what is queried all day and worth laying out. Query in place what already lands in the lake and is asked about occasionally. Most teams end up with hot reporting data in a warehouse and the raw history beside it.` },
  { stop: "Converging", title: "The two shapes are converging on open table formats", decisive: true,
    note: `<b>Apache Iceberg</b> keeps the data as open files and adds a table layer over them: a schema, ACID transactions, partition metadata, time travel. Every product on this map now reads and writes it, so "load it in" no longer has to mean a proprietary format. This is the <b>lakehouse</b>.` },
  { stop: "The bill", title: "They bill two different things",
    note: `Bytes scanned or compute time. It is a property of the product and the plan you buy, and it decides which habit saves money: reading fewer bytes, or occupying the cluster for less time.` },
  { stop: "In Israel", title: "Both providers have a region in the country",
    note: `Residency can be met in-country on Google Cloud and on AWS. Choosing the in-country region is still a trade: not every feature of a service is offered in every region, so read the service's regional table before designing on it.` },
];

const CSS = (k) => extra(k) + `
.lw .${k} .svc { fill:none; stroke:var(--accent); stroke-width:1.5; stroke-dasharray:5 5; }
`;

const rows = (x, list, cls = "") => list.map(([name, what], i) => pill(x, 236 + i * 40, 124, 30, name, cls, cls ? "acc" : "") + t(x + 136, 252 + i * 40, what, "lbl l")).join("");

const scene = () => `<svg viewBox="0 0 760 412">
  ${on("0 1 2 3", zone(14, 10, 360, 392, "WAREHOUSE — LOAD IT IN") + `<rect class="svc" x="34" y="40" width="320" height="176" rx="10"/>`
    + pill(54, 54, 280, 38, "SQL engine", "hit", "acc") + arrow(194, 122, 194, 96) + box(54, 124, 280, 78) + t(194, 152, "storage the service owns", "")
    + t(194, 178, "its own format · partitioned · clustered", "lbl"))}
  ${on("0 1", rows(34, WAREHOUSES))}
  ${on("2", pill(34, 240, 320, 40, "the core reporting fact table", "hit", "acc") + t(194, 306, "dozens of dashboards, all day", "lbl") + t(194, 330, "pruning and clustering pay for the load", "lbl"))}
  ${on("3", rows(34, ICEBERG_L, "hit") + arrow(338, 73, 402, 140) + t(194, 346, "the warehouse engines,", "lbl") + t(194, 366, "reading and writing open tables", "lbl"))}

  ${on("1 2 3", zone(386, 10, 360, 392, "LAKE — QUERY IT WHERE IT SITS") + `<rect class="svc" x="406" y="40" width="320" height="64" rx="10"/>`
    + pill(426, 54, 280, 38, "SQL engine, as a service", "hit", "acc") + arrow(566, 122, 566, 108))}
  ${on("1 2", box(426, 124, 280, 78) + t(566, 152, "files in your own bucket", "") + t(566, 178, "Parquet · CSV · Iceberg tables", "lbl"))}
  ${on("1", rows(406, OVER_LAKE))}
  ${on("2", pill(406, 240, 320, 40, "raw monthly exports in a bucket", "", "") + t(566, 306, "an ad-hoc question, twice a quarter", "lbl") + t(566, 330, "no load step to build or pay for", "lbl"))}
  ${on("3", box(426, 124, 280, 78, "", "hit") + t(566, 146, "Apache Iceberg", "acc") + t(566, 168, "open files + a table layer", "lbl") + t(566, 188, "schema · transactions · time travel", "lbl")
    + rows(406, ICEBERG_R, "hit") + t(566, 346, "one copy, in an open format,", "lbl") + t(566, 366, "for more than one engine", "lbl"))}

  ${on("4", zone(14, 10, 360, 392, "BILLED BY BYTES SCANNED") + zone(386, 10, 360, 392, "BILLED BY COMPUTE TIME")
    + pill(34, 52, 320, 40, "BigQuery, on-demand", "hit", "acc") + t(194, 114, "per TiB read", "lbl")
    + pill(34, 150, 320, 40, "Amazon Athena", "hit", "acc") + t(194, 212, "$5 per TB scanned in US regions,", "lbl") + t(194, 232, "10 MB minimum a query; check il-central-1", "lbl")
    + t(194, 300, "the saving habit", "lbl") + t(194, 326, "read fewer bytes", "h acc") + t(194, 372, "a TB is not a TiB: they differ by 10%", "lbl")
    + pill(406, 52, 320, 40, "BigQuery editions", "", "") + t(566, 114, "slots, by the hour", "lbl")
    + pill(406, 150, 320, 40, "Snowflake", "", "") + t(566, 212, "a warehouse, while it is running", "lbl")
    + pill(406, 244, 320, 40, "Redshift", "", "") + t(566, 306, "nodes by the hour, or serverless capacity", "lbl")
    + t(566, 348, "the saving habit", "lbl") + t(566, 374, "occupy it for less time", "h"))}

  ${on("5", zone(14, 10, 360, 392, "GOOGLE CLOUD — me-west1, TEL AVIV") + zone(386, 10, 360, 392, "AWS — il-central-1, TEL AVIV")
    + ["BigQuery", "AlloyDB"].map((s, i) => pill(34, 52 + i * 52, 320, 38, s, "hit", "acc")).join("")
    + t(194, 196, "BigQuery there lacks some features", "lbl") + t(194, 216, "it has elsewhere; BigQuery Omni is not", "lbl") + t(194, 236, "offered in any Middle East region", "lbl")
    + ["Redshift and Redshift Serverless", "Athena", "S3 Tables", "Lake Formation"].map((s, i) => pill(406, 52 + i * 52, 320, 38, s, "hit", "acc")).join("")
    + + t(194, 322, "Is there a region in the country?", "") + t(194, 348, "Yes, on both.", "ok")
    + t(566, 322, "What still keeps a store on-prem?", "") + t(566, 348, "Classification, air-gap, your approval path.", "lbl"))}
</svg>`;

export default widget({ key: "mp", label: "The product map", css: CSS("mp"), steps, scene, captured: {} });

// cdb-around — the three controls that sit around the access layers: an authorized view that brokers
// a slice of a table the reader cannot touch, the audit log that records every read, and a
// customer-managed key that can switch the data off. Facts are BigQuery's documented behaviour,
// checked 2026-11 (the fact-check report for this module); nothing here is a measurement of ours.
import { arrow, box, extra, on, pill, t, widget, zone } from "./cdb-lib.js";

const steps = () => [
  { stop: "A view", title: "An authorized view: access without the grant",
    note: `The layers narrow what someone with access may see. This solves the opposite problem: a team with <b>no access</b> to the table gets one curated slice of it. They are granted the view's dataset only; the source dataset authorizes the view to read it on their behalf.` },
  { stop: "The log", title: "Every read is written down",
    note: `The controls decide who <b>can</b>. The audit log answers who <b>did</b>. For BigQuery the Data Access log is written by default and cannot be switched off, which is the guarantee an audit wants: the record exists whether or not anyone remembered to enable it.` },
  { stop: "Your key", title: "CMEK: a key the provider does not hold", decisive: true,
    note: `With a customer-managed key in Cloud KMS, every read has to go through your key. Disable it and the data stops being readable, for everyone, whatever their grants, <b>within about an hour</b>. It is a switch you hold and the provider does not, and it has an edge.` },
  { stop: "On AWS", title: "The same four ideas on the other provider",
    note: `Names change between products; the model does not. Region still comes first: these controls sit inside a region you chose for residency, and several of them require their parts to be in the same one.` },
];

const CSS = (k) => extra(k);

const scene = () => `<svg viewBox="0 0 760 392">
  ${on("0", zone(14, 10, 210, 372, "THE READERS") + zone(236, 10, 250, 372, "DATASET reporting") + zone(498, 10, 248, 372, "DATASET raw — RESTRICTED")
    + pill(34, 60, 170, 46, "transparency team", "", "") + t(119, 130, "dataViewer on reporting", "lbl") + t(119, 150, "nothing on raw", "hot")
    + arrow(208, 83, 252, 83) + box(256, 50, 210, 130, "", "hit") + t(361, 70, "the view", "acc")
    + t(272, 100, "SELECT region, COUNT(*)", "mono l") + t(272, 122, "FROM raw.case_files", "mono l") + t(272, 144, "GROUP BY region", "mono l")
    + arrow(470, 115, 514, 115) + box(518, 60, 208, 110, "", "") + t(622, 96, "raw.case_files", "mono") + t(622, 124, "one row per citizen", "lbl")
    + t(622, 208, "raw authorizes the view", "acc") + t(622, 230, "to read it", "lbl")
    + t(361, 218, "counts per region go back;", "lbl") + t(361, 240, "the rows never do", "lbl")
    + t(119, 250, "cannot query raw", "lbl") + t(119, 272, "cannot widen the SELECT", "lbl")
    + t(361, 306, "Snowflake: a secure view", "lbl") + t(361, 328, "Redshift: an ordinary view, which", "lbl") + t(361, 348, "reads with its owner's permissions", "lbl")
    + t(622, 306, "the two datasets must be", "lbl") + t(622, 328, "in the same region", "lbl"))}

  ${on("1", zone(14, 10, 360, 372, "ONE ENTRY IN THE DATA ACCESS LOG") + zone(386, 10, 360, 372, "TWO PLACES TO LOOK")
    + [["who", "the principal's identity"], ["what", "the SQL text, the tables read"], ["when", "the timestamp"]].map(([k, v], i) => pill(34, 54 + i * 62, 90, 38, k, "hit", "acc") + t(140, 74 + i * 62, v, "l")).join("")
    + t(194, 262, "on by default for BigQuery,", "") + t(194, 286, "and it cannot be disabled", "ok")
    + t(194, 336, "The log holds query text: it is sensitive too.", "lbl")
    + pill(406, 54, 320, 40, "the job history, in SQL", "", "") + t(566, 116, "convenient for your own usage;", "lbl") + t(566, 136, "kept 180 days", "hot")
    + pill(406, 180, 320, 40, "Cloud Audit Logs, routed to a sink", "ok", "ok") + t(566, 242, "the durable record an audit asks for:", "lbl") + t(566, 262, "retention is yours to set", "lbl")
    + t(566, 336, "A question about six months ago needs the sink.", ""))}

  ${on("2", zone(14, 10, 732, 372, "WHO HOLDS THE KEY")
    + pill(40, 56, 190, 46, "your key, in Cloud KMS", "hit", "acc") + arrow(236, 79, 300, 79) + t(268, 62, "wraps", "lbl")
    + pill(308, 56, 190, 46, "the data keys", "", "") + arrow(504, 79, 568, 79) + pill(576, 56, 150, 46, "the table", "", "")
    + t(40, 156, "you disable the key", "l hot") + t(250, 156, "→", "") + t(280, 156, "unreadable for everyone, within about an hour", "l")
    + t(40, 190, "you re-enable it", "l ok") + t(250, 190, "→", "") + t(280, 190, "access returns; performance can lag for days", "l")
    + t(40, 224, "unavailable for 60 days", "l hot") + t(250, 224, "→", "") + t(280, 224, "BigQuery may delete the table", "l hot")
    + t(40, 284, "The key ring must be in the same location as the dataset.", "lbl l")
    + t(40, 310, "You now own rotation, and the risk that a mistaken disable takes the warehouse offline.", "lbl l")
    + t(40, 350, "Use it where the requirement to hold the switch is real, not by reflex.", "l"))}

  ${on("3", zone(14, 10, 732, 372, "THE MODEL IS PORTABLE; THE NAMES ARE NOT")
    + t(250, 50, "BIGQUERY", "cap") + t(500, 50, "AWS", "cap")
    + [["rows", "row access policy", "Redshift row-level security"], ["columns", "policy tags", "Redshift column grants"],
       ["the lake", "BigLake tables", "Lake Formation: rows, columns, tags"], ["brokered slice", "authorized view", "a view, with its owner's rights"],
       ["your own key", "CMEK, Cloud KMS", "AWS KMS"]].map(([what, g, a], i) =>
      t(40, 86 + i * 46, what, "l") + pill(240, 68 + i * 46, 230, 34, g, "", "") + pill(490, 68 + i * 46, 240, 34, a, "", "")).join("")
    + t(40, 326, "Residency is decided before any of this, when the region is chosen.", "l")
    + t(40, 354, "An authorized view and its source, a key ring and its dataset: each pair shares one location.", "lbl l"))}
</svg>`;

export default widget({ key: "ar", label: "Around the access layers", css: CSS("ar"), steps, scene, captured: {} });

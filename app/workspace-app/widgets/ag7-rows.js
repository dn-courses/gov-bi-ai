// ag7-rows — what the agent may read, per person: two people ask the same question through one
// agent. The regions are the four of the lab's shop star (dim_customer.region); which rows each
// person gets is the design being drawn, not a query that was run. No revenue figures are shown.
import { CSS, arrow, chip, from, lit, node, on, svg, t, widget } from "./ag7-lib.js";

const REGIONS = ["Americas", "Europe", "Asia-Pacific", "Middle East and Africa"];

const steps = () => [
  { stop: "Ask", title: "Two people, one question, one agent",
    note: `Noa works in the Europe office and may see Europe. Avi works in finance and may see every region. Both open the same agent and ask the same question.` },
  { stop: "The trap", title: "The warehouse sees the agent, not the person", decisive: true,
    note: `The query reaches BigQuery as the agent's runtime account, so both get what <i>that account</i> may read: all four regions. The agent has lent Noa rights she does not hold. This is the <b>confused deputy</b>: a program with more rights than its caller, used on the caller's behalf.` },
  { stop: "As the user", title: "Design 1: the agent queries as the person",
    note: `The agent receives the person's own credentials (an OAuth sign-in that lets it act for her) and runs the query with them. The warehouse's existing rules apply unchanged: a row access policy on region gives Noa Europe and Avi everything.` },
  { stop: "One account", title: "Design 2: one account, rules keyed on who is asking",
    note: `The agent keeps one account, and the <i>tool code</i> tells the database who is asking before each query, in a session value the model cannot set. A rule in the database reads that value. Same rows as design 1; the agent's code now carries part of the security.` },
  { stop: "Per audience", title: "Design 3: one agent per audience",
    note: `The simplest: a deployment per audience, each with its own runtime account and its own slice of the warehouse. No per-person logic at all; the price is one more service and one more slice for each audience.` },
];

const NOA = 52, AVI = 248, ROWH = 24, GAP = 4;
const person = (y, name, sub) => `${node(24, y, 200, 56, "")}${t(124, y + 19, name, "h")}${t(124, y + 39, sub, "lbl")}`;
// Noa's list starts with the one region she may see, so it stays put when the others go.
const result = (y, slot, name, cls) => chip(24, y + 62 + slot * (ROWH + GAP), 200, ROWH, name, cls, "lbl");
const NOA_ORDER = ["Europe", "Americas", "Asia-Pacific", "Middle East and Africa"];

const scene = () => svg(760, 430, `
  ${t(380, 22, "“What was revenue by region in 2025?”", "h")}
  ${lit("0", person(NOA, "Noa", "Europe office"))}
  ${lit("0", person(AVI, "Avi", "finance, all regions"))}

  ${node(540, 150, 196, 70, "")}${t(638, 172, "BigQuery", "h")}${t(638, 196, "shop_mart · fact_sales", "lbl")}

  ${on("0 1 2 3", `${node(296, 150, 172, 70, "", "you")}${t(382, 172, "the agent", "h")}
    ${on("0 1 3", t(382, 196, "one runtime account", "lbl"))}${on("2", t(382, 196, "the asker's credentials", "lbl"))}
    ${arrow(224, NOA + 28, 294, 172, "")}${arrow(224, AVI + 28, 294, 200, "")}`)}

  ${on("0 1", lit("1", arrow(468, 185, 538, 185, "")))}
  ${on("1", lit("1", `${t(503, 246, "sees: the agent's", "tag")}${t(503, 264, "account", "tag")}`))}
  ${on("2", lit("2", `${arrow(468, 172, 538, 168, "")}${arrow(468, 198, 538, 202, "")}
    ${t(503, 154, "as noa@…", "tag")}${t(503, 220, "as avi@…", "tag")}
    ${t(638, 244, "row access policy", "tag")}${t(638, 262, "on region", "tag")}`))}
  ${on("3", lit("3", `${arrow(468, 185, 538, 185, "")}${t(503, 120, "agent's account", "tag")}${t(503, 138, "+ asking: noa@…", "tag")}
    ${t(638, 244, "rule reads", "tag")}${t(638, 262, "who is asking", "tag")}`))}
  ${on("4", lit("4", `${node(296, 60, 172, 62, "", "you")}${t(382, 80, "agent · Europe", "h")}${t(382, 102, "its own account", "lbl")}
    ${node(296, 250, 172, 62, "", "you")}${t(382, 270, "agent · finance", "h")}${t(382, 292, "its own account", "lbl")}
    ${arrow(224, NOA + 28, 294, 90, "")}${arrow(224, AVI + 28, 294, 280, "")}
    ${arrow(468, 92, 560, 148, "")}${arrow(468, 280, 560, 222, "")}
    ${t(638, 120, "a Europe-only slice", "tag")}${t(638, 250, "the whole mart", "tag")}`))}

  ${from("1", result(NOA, 0, NOA_ORDER[0], "ok"))}
  ${on("1", [1, 2, 3].map((i) => result(NOA, i, NOA_ORDER[i], "warm")).join(""))}
  ${from("1", REGIONS.map((name, i) => result(AVI, i, name, "")).join(""))}
`);

export default widget({ key: "ag7rw", label: "Two callers, different rows", css: CSS("ag7rw"), steps, scene });

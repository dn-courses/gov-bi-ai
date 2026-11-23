// ag1-pagila — what the part builds: a question in English goes in, SQL runs on Pagila, an answer
// in English comes out. The database as an ERD, and three questions with their measured answers.
import { schema, TABLE_CSS } from "@widget-lib/table.js";
import { fmt, widget, zone } from "./ag1-lib.js";

// Every number here was measured on the preview's Pagila (the agents lab's seed) on 2026-11-21;
// the page's cells run the same queries.
const CAPTURED = {
  // SELECT count(*) FROM <table>, for each base table that is not a payment_p2022_* partition
  tables: { film: 1000, actor: 200, film_actor: 5462, category: 16, film_category: 2367, language: 6,
            customer: 599, rental: 16044, payment: 16049, inventory: 4581, store: 500, staff: 1500,
            address: 603, city: 600, country: 109, docs: 6 },
  partitions: 7, // payment_p2022_01 … _07
  topCustomer: { name: "KARL SEAL", total: "221.55" },
  actors: [["GINA DEGENERES", 42], ["WALTER TORN", 41], ["MARY KEITEL", 40]], // films the actor appears in (measured 2026-11-22)
};
const D = CAPTURED, T = D.tables;

// Pagila's tables as an ERD: an arrow from each table to the table its foreign key references.
// [name, cx, cy] in a 920 × 480 drawing, laid out so that keys rarely cross; the row count is
// printed on the card.
const TABLES = [
  ["category", 124, 40], ["language", 352, 40], ["actor", 580, 40],
  ["film_category", 124, 120], ["film", 352, 120], ["film_actor", 580, 120], ["store", 802, 120],
  ["inventory", 352, 200], ["customer", 580, 200],
  ["rental", 124, 280], ["payment", 352, 280], ["address", 802, 280],
  ["staff", 580, 360], ["city", 802, 360],
  ["docs", 124, 440], ["country", 802, 440],
];
const FKS = [["film_actor", "actor"], ["film_actor", "film"], ["film", "language"], ["film_category", "category"],
  ["film_category", "film"], ["inventory", "film"], ["inventory", "store"], ["rental", "inventory"], ["rental", "customer"],
  ["rental", "staff"], ["payment", "rental"], ["payment", "customer"], ["payment", "staff"], ["customer", "store"],
  ["customer", "address"], ["staff", "store"], ["staff", "address"], ["store", "address"], ["address", "city"], ["city", "country"]];
const INDEX = Object.fromEntries(TABLES.map(([n], i) => [n, i]));
const erd = () => `<svg class="erd" viewBox="0 0 920 480">${schema(
  TABLES.map(([n, x, y]) => [n, x, y, n === "docs" ? "off" : "", T[n]]), FKS.map(([a, b]) => [INDEX[a], INDEX[b]]))}</svg>`;

// The three questions: every card the same size, every answer in the same type.
const QUESTIONS = (D) => [
  ["How many films do we have?", [`${fmt(T.film)} films`]],
  ["Which customer has spent the most?", [D.topCustomer.name, D.topCustomer.total]],
  ["Which actors appear in the most films?", D.actors.map(([name, n]) => `${name} · ${n}`)],
];

const steps = [
  { stop: "The agent", title: "Talk to your data",
    note: `A person asks in English. The agent writes SQL, runs it on the database, and answers in English. Nobody in the chain hands it a query.` },
  { stop: "Pagila", title: "The database: a video-rental business",
    note: `${Object.keys(T).length - 1} tables and one added table of documents. Films and who acts in them; customers, the copies they rent, and what they pay. <code>payment</code> is partitioned by month; its ${D.partitions} partitions are not listed.` },
  { stop: "Questions", title: "Three questions, answered by hand first",
    note: `These are the answers the agent will be checked against.` },
];

const node = (title, sub, on) => `<div class="party ${on ? "on" : ""}" style="flex:1"><b>${title}</b><span>${sub}</span></div>`;
const arrow = (label) => `<div class="hop on" style="min-width:74px"><span>${label}</span><i>→</i></div>`;

function view(step, at) {
  if (at === 0) return zone("One question, end to end", `<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap">
    ${node("a person", "a question in English")}${arrow("English")}${node("the agent", "a model, a loop, tools", true)}${arrow("SQL")}${node("Pagila", "PostgreSQL")}</div>
    <div style="display:flex; align-items:center; gap:6px; margin-top:10px; flex-wrap:wrap">
    ${node("a person", "an answer in English")}<div class="hop on" style="min-width:74px"><span>English</span><i>←</i></div>${node("the agent", "reads the rows", true)}<div class="hop on" style="min-width:74px"><span>rows</span><i>←</i></div>${node("Pagila", "runs the query")}</div>`);
  if (at === 1) return zone("Pagila — tables, their row counts, and the keys between them", erd()
    + `<p class="small" style="margin-top:8px">an arrow points from a table to the table it references · <code>docs</code> is added for a later lesson</p>`);
  return `<div class="cols qs" style="--cols:1fr 1fr 1fr">${QUESTIONS(D).map(([q, lines]) =>
    zone(q, lines.map((l) => `<p class="ans">${l}</p>`).join(""))).join("")}</div>`;
}

const css = TABLE_CSS("ag1") + `
.lw .ag1 svg.erd { width:100%; height:auto; display:block; }
.lw .ag1 .qs { align-items:stretch; }
.lw .ag1 .qs .zone { min-height:150px; }
.lw .ag1 .qs .ans { font:600 18px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
`;

export default widget({ label: "What we are building", css, steps, view });

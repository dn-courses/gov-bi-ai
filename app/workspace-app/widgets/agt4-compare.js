// agt4-compare — what changes when the tool design changes: the same seven questions and the same
// instruction, six toolsets, each run three times. Tools too small, one missing, one too many (ignored),
// one ambiguous twin (chosen, and wrong), tools by job; then all six side by side. Runs in agt4-data.js.
import { fmt, widget, zone } from "./ag1-lib.js";
import { CSS, panel, totals } from "./agt4-lib.js";

const KEYS = [
  ["find_film(title: str)", "", "returns the film_id"],
  ["find_customer(name: str)", "", "returns customer_id and home store_id"],
  ["copies(film_id: int, store: int)", "hot", "the inventory_ids of one film at one store"],
  ["is_rented_out(inventory_id: int)", "hot", "one copy: out or not"],
  ["rentals_of(customer_id: int)", "hot", "the 20 latest rentals, as inventory_ids"],
  ["film_of_copy(inventory_id: int)", "hot", "the title of one copy"],
];
const JOB = [
  ["film_stock(title: str)", "ok", "per store: copies, rented_out, on_shelf, counted in SQL"],
  ["customer_history(name: str)", "ok", "home store, rentals made, every film still out, five latest"],
  ["copies_out(store: int)", "ok", "how many of a store's copies are out, and the ten oldest"],
];
const MISSING = [JOB[0], ["customer_history(name: str)", "off", "left out"], JOB[2]];
const EXTRA = [...JOB, ["get_rows(table: str, column: str, value: str)", "hot", "the starter, kept beside them"]];
const TWIN = [...JOB, ["stock_at_store(title: str, store: int)", "hot", "“The stock of one film at one store.” Returns in_stock: the copies the store owns"]];

const SETS = [["weak", "one general tool (the starter)"], ["keys", "tools by key"], ["missing", "one tool missing"],
  ["extra", "the general tool kept beside"], ["twin", "an ambiguous twin"], ["good", "tools by job"]];
const t = Object.fromEntries(SETS.map(([key]) => [key, totals(key)]));

const steps = [
  { stop: "Too small", title: "Tools by key: one call per row",
    note: `Each tool does one lookup by id, so the model walks film → copies → each copy, one call at a time: ${t.keys.score} of 7 in about ${t.keys.model} model calls. Store 1's 92 copies out cannot be reached copy by copy, and <code>rentals_of</code>'s cap of 20 hides TAMMY SANDERS's three films: the model says she has none.` },
  { stop: "One missing", title: "Without the customer tool, every customer question fails",
    note: `${t.missing.score} of 7: the four questions about a customer have no way in. The model mostly says so (once it guessed her store, and was wrong), in about ${t.missing.model} model calls. When an answer reads “the tools cannot”, a tool is missing.` },
  { stop: "Ignored", title: "The general tool kept beside them was never called",
    note: `${t.extra.score} of 7, the same calls as without it: the three job tools describe the questions better. It still costs tokens, its declaration rides in every model call: ${fmt(t.extra.tokens)} a sheet against ${fmt(t.good.tokens)}.` },
  { stop: "A twin", title: "An ambiguous twin is chosen, and is wrong", decisive: true,
    note: `<code>stock_at_store</code> says “the stock of one film at one store”, and the questions name one store, so the model takes it for Q1, Q6 and Q7. It counts the copies a store owns, not those on the shelf: ${t.twin.score} of 7, every run. Two tools that read alike make the model choose, and the docstring is all it chooses by.` },
  { stop: "By job", title: "Three tools by job: one call per fact",
    note: `Each question is one call; Q6 is two, <code>customer_history</code> then <code>film_stock</code> at her store; Q7 is one, then three <code>film_stock</code> calls sent in one turn. Arguments are what the manager says, the counting is in SQL: ${t.good.score} of 7 in ${t.good.model} model calls, three runs out of three.` },
  { stop: "Side by side", title: "Same questions, same instruction, six toolsets",
    note: `Each toolset ran the sheet three times. The design alone moved the score from ${t.weak.score} to 7 and the tokens by a factor of ${Math.round(t.weak.tokens / t.good.tokens)}.` },
];

const all = () => {
  const rows = SETS.map(([key, name]) => `<tr class="${key === "good" ? "mk" : ""}"><td>${name}</td><td class="n">${t[key].score} / 7</td><td class="n">${t[key].model}</td>
    <td class="n">${t[key].tools}</td><td class="n">${fmt(t[key].tokens)}</td><td class="n">${t[key].seconds}</td></tr>`);
  return zone("three runs of the sheet each · score range, averages", `<table class="t"><thead><tr><th>toolset</th><th class="n">score</th><th class="n">model calls</th>
    <th class="n">tool calls</th><th class="n">tokens</th><th class="n">seconds</th></tr></thead><tbody>${rows.join("")}</tbody></table>
    <p class="small" style="margin-top:8px">gemini-3.5-flash-lite through ADK, three questions at a time; recorded 2026-11-24</p>`);
};

const VIEWS = [() => panel("tools by key", "keys", KEYS), () => panel("one tool missing", "missing", MISSING),
  () => panel("the general tool kept beside", "extra", EXTRA), () => panel("an ambiguous twin", "twin", TWIN),
  () => panel("tools by job", "good", JOB), all];

export default widget({ label: "What the design changed", css: CSS, steps, view: (step, at) => VIEWS[at]() });

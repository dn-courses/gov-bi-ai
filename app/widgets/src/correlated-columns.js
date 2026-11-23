// correlated-columns — two filters whose columns move together: the planner multiplies their shares
// as if they were independent, and the estimate collapses. Captured in the lab: the estimates and the real count.
import { bar, cards } from "../lib/cards.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const CAPTURED = { rows: 5000000, country: 255500, currency: 255500, multiplied: 13056, actual: 250000, told: 247997 };
const pct = (n, of) => `${((100 * n) / of).toFixed(2)}%`;

const steps = (D) => [
  { stop: "Each alone", title: "Each filter alone is estimated well",
    note: `One order in twenty is from Israel. One order in twenty is paid in shekels. Both shares come straight from the statistics.` },
  { stop: "Together", title: "Together, the planner multiplies the shares",
    note: `${pct(D.country, D.rows)} × ${pct(D.currency, D.rows)} of ${fmt(D.rows)} rows: it assumes the two columns have nothing to do with each other.` },
  { stop: "Reality", title: "But every Israeli order is paid in shekels",
    note: `The second filter removes nothing. The estimate is <b>${Math.round(D.actual / D.multiplied)} times too low</b>, and every decision above this scan in the plan inherits it.` },
  { stop: "Told so", title: "Extended statistics record that the columns move together", decisive: true,
    note: `<code>CREATE STATISTICS</code> on the pair, then <code>ANALYZE</code>: the planner now knows that currency follows from country.` },
];

const scene = (D) => `
  <div class="card"><h4>Rows the plan expects, of ${fmt(D.rows)}</h4><div class="bars">
    ${bar({ label: "country = 'IL'", share: D.country / D.actual, value: D.country, small: "estimated" })}
    ${bar({ label: "currency = 'ILS'", share: D.currency / D.actual, value: D.currency, small: "estimated" })}
    ${bar({ label: "both", sub: "the two shares multiplied", share: D.multiplied / D.actual, value: D.multiplied, small: "estimated", colour: "hot", on: 'data-from="1"' })}
    ${bar({ label: "both", sub: "what is there", share: 1, value: D.actual, small: "actual", on: 'data-from="2"' })}
    ${bar({ label: "both", sub: "with extended statistics", share: D.told / D.actual, value: D.told, small: "estimated", colour: "acc", on: 'data-from="3"' })}
  </div></div>`;

export default { render: build({ stepper, key: "cc", label: "Columns that move together", css: cards("cc"), steps, scene, captured: CAPTURED }) };

// ag6-blast — "Why Free SQL Is Not Production": blast radius. What the planted query got, what the
// role analyst_ro would have let it get. What the role refuses is shown with the defences.
//
// CAPTURED 2026-11-22 in the agents lab through the page's run_sql (role analyst_ro on `shop`): the
// planted query's five rows; count(*) of each mart table. The grants are seed/05-shop-mart.sql's.
import { esc, staged } from "./ag4-lib.js";
import { AUDIT } from "./ag6-inject.js";

const ALLOWED = [
  ["mart.dim_customer", "100,000 customers: key, country, region, signed_up"],
  ["mart.fact_sales", "1,666,665 order lines"],
  ["mart.dim_product", "10,000 products"],
  ["mart.dim_date", "731 days"],
];

const steps = [
  { stop: "It got", title: "What the planted query took: five customers",
    note: `Keys, countries and sign-up dates, sent to whoever reads the answer. The note asked for five rows. It could have asked for any number.` },
  { stop: "It could", title: "What the role would have handed over",
    note: `<code>analyst_ro</code> may read every table of the star. Every customer's country and sign-up date was one query away, and the agent runs whatever query it is talked into.` },
  { stop: "The target", title: "Damage control, not a fix", decisive: true,
    note: `The role sets how much a planted note can take; it does not stop the note from taking it. One component that can read everything the role can read is the most valuable thing in the system to steer.` },
];

const CSS = `
.lw .ag6b td .chip { font-size:13px; }
.lw .ag6b[data-at="2"] .reach { border-color:var(--hot); }
`;

const scene = () => `
  <div class="cols wide-left">
    <div class="zone">
      <p class="cap">rows the planted query returned</p>
      <table><thead><tr><th>customer_key</th><th>country</th><th>signed_up</th></tr></thead>
        <tbody>${AUDIT.map((r) => `<tr>${r.map((v) => `<td class="mono">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    </div>
    <div class="zone reach" data-from="1">
      <p class="cap">analyst_ro</p>
      <table><tbody>
        ${ALLOWED.map(([what, size]) => `<tr><td><span class="mono">${what}</span><br><span class="dim">${size}</span></td><td><span class="chip hot">readable</span></td></tr>`).join("")}
      </tbody></table>
    </div>
  </div>`;

export default staged({ key: "ag6b", label: "How far one planted note reaches", css: CSS, steps, scene });

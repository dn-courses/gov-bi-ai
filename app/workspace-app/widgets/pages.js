// pages — a table's file as equal pages, one page opened, and a scan sweeping all of them.
// Captured data only for now: measured in the lab, not yet read live.
import { stepper } from "@widget-lib/stepper.js";

const D = {
  fileBytes: 819200, pageBytes: 8192, pages: 100, rowsPerPage: 100, rowBytes: 64,
  header: 24, pointers: 400, free: 1368, rows: 6400, // the four regions of one page, in bytes
  target: { id: 4242, page: 42, slot: 42 },
  tables: [["products", 100], ["customers", 824], ["orders", 66657]],
};
const n = (x) => x.toLocaleString("en-US");

const STEPS = [
  { stop: "The file", title: "A file cut into equal pieces",
    note: `The <code>products</code> file is ${n(D.fileBytes)} bytes: exactly ${D.pages} pieces of ${n(D.pageBytes)} bytes. Each piece is a <b>page</b>.` },
  { stop: "One page", title: "A page is a batch of rows", produces: `${D.rowsPerPage} rows per page`,
    note: `Open one. A short header, a list of where each row starts, and the rows themselves, ${D.rowBytes} bytes each. The database reads and writes whole pages, never a single row.` },
  { stop: "Address", title: "Every row has an address", produces: `(${D.target.page}, ${D.target.slot})`,
    note: `Product ${D.target.id} is row ${D.target.slot} of page ${D.target.page}. The page number says where in the file; the row number says where in the page.` },
  { stop: "Scan", title: "With no other way in: every page", produces: `${D.pages} pages read`,
    note: `Nothing tells the database which page holds product ${D.target.id}, so it reads page 0, then 1, then 2. It finds the row on page ${D.target.page} and reads on to the end: there might be another.` },
  { stop: "Scale", title: "The same loop on a bigger table", decisive: true,
    note: `The loop does not change; the number of pages does. One row out of <code>orders</code> the same way means reading ${n(D.tables[2][1])} pages.` },
];

const CSS = `
.lw .pgs { display:grid; grid-template-columns:minmax(280px, 340px) minmax(260px, 1.25fr); gap:16px; align-items:start; }
.lw .pgs .zone { background:var(--panel); border:1.5px solid var(--line); border-radius:12px; padding:12px 14px; }
.lw .pgs h4 { margin:0 0 10px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .pgs .grid { display:grid; grid-template-columns:repeat(10, 1fr); gap:4px; container-type:inline-size; }
.lw .pgs .grid i { aspect-ratio:1; border-radius:4px; background:var(--cell); border:1px solid var(--line); display:grid; place-items:center;
      font:normal 3.7cqw ui-monospace, Menlo, monospace; color:var(--mute);
      transition:background .35s, border-color .35s; }
.lw .pgs[data-at="1"] .grid i.t, .lw .pgs[data-at="2"] .grid i.t { background:var(--accent); border-color:var(--accent); }
.lw .pgs:not([data-at="0"]) .grid i.t { color:var(--accent-ink); font-weight:700; }
.lw .pgs[data-at="3"] .grid i { background:var(--accent-bg); border-color:var(--accent); transition-delay:calc(var(--i) * 22ms); }
.lw .pgs[data-at="3"] .grid i.t { background:var(--accent); }
.lw .pgs .sub { margin:10px 0 0; font:13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .pgs .detail { min-height:300px; }
.lw .pgs .detail > * { animation: lw-in .4s both; }
.lw .pgs .page { display:grid; grid-template-columns:minmax(70px, 150px) 1fr; gap:0 18px; align-items:center; }
.lw .pgs .page .stack { display:flex; flex-direction:column; height:250px; border:1.5px solid var(--line); border-radius:8px; overflow:hidden; }
.lw .pgs .page .stack b { display:block; min-height:3px; }
.lw .pgs .page .hd { background:var(--mute); } .lw .pgs .page .lp { background:var(--accent); opacity:.55; }
.lw .pgs .page .fr { background:transparent; } .lw .pgs .page .rw { background:var(--accent-bg); border-top:1.5px solid var(--accent); }
.lw .pgs .page .keys { display:grid; grid-template-columns:14px 1fr; gap:14px 10px; align-items:start; font-size:15px; line-height:1.3; }
.lw .pgs .page .keys i { width:14px; height:14px; margin-top:3px; border-radius:4px; border:1.5px solid var(--line); }
.lw .pgs .page .keys small { display:block; margin-top:2px; font:13px var(--mono, ui-monospace), Menlo, monospace; color:var(--mute); }
.lw .pgs .addr { margin-top:12px; padding:8px 12px; border-radius:8px; background:var(--accent-bg); color:var(--accent);
      font:600 14px ui-monospace, Menlo, monospace; }
.lw .pgs .tally { display:grid; grid-template-columns:max-content 1fr; gap:8px 14px; font-size:15px; }
.lw .pgs .tally b { font:600 20px ui-monospace, Menlo, monospace; text-align:right; }
.lw .pgs .tally b.hot { color:var(--hot); }
.lw .pgs .bars { display:grid; grid-template-columns:max-content 1fr; gap:10px 12px; align-items:center; font-size:14px; }
.lw .pgs .bars .bar { height:16px; border-radius:8px; background:var(--mute); min-width:2px; }
.lw .pgs .bars .bar.top { background:var(--hot); }
.lw .pgs .bars .v { grid-column:2; margin-top:-8px; font:13px ui-monospace, Menlo, monospace; color:var(--mute); }
@container (max-width: 560px) { .lw .pgs { grid-template-columns:1fr; } .lw .pgs .detail { min-height:0; } }
`;

const grid = () => Array.from({ length: D.pages }, (_, i) => `<i style="--i:${i}"${i === D.target.page ? ' class="t"' : ""}>${i}</i>`).join("");
const region = (cls, bytes) => `<b class="${cls}" style="flex:${bytes}"></b>`;
const key = (cls, label, detail) => `<i class="${cls}"></i><span>${label}<small>${detail}</small></span>`;
const page = (at) => `<h4>Page ${D.target.page} — ${n(D.pageBytes)} bytes, drawn to scale</h4>
  <div class="page"><div class="stack">${region("hd", D.header)}${region("lp", D.pointers)}${region("fr", D.free)}${region("rw", D.rows)}</div>
  <div class="keys">${key("hd", "header", `${n(D.header)} bytes`)}${key("lp", "list of where each row starts", `${n(D.pointers)} bytes`)}${key("fr", "free space", `${n(D.free)} bytes`)}${key("rw", `${D.rowsPerPage} rows`, `${D.rowsPerPage} × ${D.rowBytes} = ${n(D.rows)} bytes`)}</div></div>
  ${at === 2 ? `<div class="addr">product ${D.target.id} → page ${D.target.page}, row ${D.target.slot}</div>` : ""}`;
const tally = () => `<h4>What the scan did</h4><div class="tally">
  <b>${D.pages}</b><span>pages read, in file order</span>
  <b>${n(D.pages * D.rowsPerPage)}</b><span>rows looked at</span>
  <b>1</b><span>row kept</span>
  <b class="hot">${n(D.pages * D.rowsPerPage - 1)}</b><span>rows thrown away</span></div>`;
const bars = () => { const max = D.tables[D.tables.length - 1][1]; return `<h4>Pages to read for one row, to scale</h4><div class="bars">${D.tables.map(([t, p]) =>
  `<span>${t}</span><span class="bar${p === max ? " top" : ""}" style="width:${(p / max) * 100}%"></span><span class="v">${n(p)} pages</span>`).join("")}</div>`; };

function render({ model, el }) {
  let root;
  const ui = stepper({
    el, model, label: "A table, one page at a time", css: CSS, steps: () => STEPS,
    draw({ at, body }) {
      if (!root) {
        body.innerHTML = `<div class="pgs"><div class="zone"><h4>The products file — pages 0 to ${D.pages - 1}</h4><div class="grid">${grid()}</div>
          <p class="sub">${n(D.fileBytes)} bytes = ${D.pages} × ${n(D.pageBytes)}</p></div><div class="zone detail"></div></div>`;
        root = body.querySelector(".pgs");
      }
      root.dataset.at = at;
      const side = root.querySelector(".detail");
      side.style.visibility = at === 0 ? "hidden" : "visible";
      side.innerHTML = at === 1 || at === 2 ? page(at) : at === 3 ? tally() : at === 4 ? bars() : "";
    },
  });
  ui.show(Number(model?.get?.("start") ?? 0));
  return () => ui.destroy();
}
export default { render };

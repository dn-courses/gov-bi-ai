// db-anatomy — opening the "database" box into nodes and edges: clients, processes, memory, disk.
//
// One svg whose objects persist; a step only switches layers on (CSS transitions do the motion), so
// stepping backwards is the same code as stepping forwards.
//
// It draws at once from CAPTURED — read off PostgreSQL 18 and the lab's `shop` database — then asks
// the lab for the same facts and redraws from the answer: which background processes are running,
// how large shared memory is, and the files behind three tables. It only reads.

import { live } from "../lib/kernel.js";
import { stepper } from "../lib/stepper.js";

const DB = "shop";
// The tables listed under FILES ON DISK, in drawing order; the first is the one a backend reads.
const TABLES = ["orders", "order_items", "products"];
// The background processes that get a chip of their own, in drawing order. `io worker` is drawn
// last, as one chip with its count; anything else running is counted in `auxCount` only.
const NAMED = ["checkpointer", "background writer", "walwriter", "autovacuum launcher"];

const CAPTURED = {
  memory: "128 MB",
  aux: ["checkpointer", "background writer", "walwriter", "autovacuum launcher", "io workers × 3"],
  auxCount: 8,
  files: [
    ["base/17286/17374", "orders", "521 MB"],
    ["base/17286/17389", "order_items", "746 MB"],
    ["base/17286/17354", "products", "800 kB"],
  ],
};

async function load(kernel) {
  const [processes, [[buffers]], files] = await kernel.sql(
    [
      `SELECT backend_type, count(*)::int FROM pg_stat_activity
       WHERE backend_type <> 'client backend' GROUP BY 1`,
      `SELECT current_setting('shared_buffers')`,
      `SELECT pg_relation_filepath(oid), relname, pg_size_pretty(pg_relation_size(oid))
       FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
         AND relname IN (${TABLES.map((t) => `'${t}'`).join(", ")})`,
    ],
    { dbname: DB },
  );
  const running = new Map(processes);
  const io = running.get("io worker") ?? 0;
  const size = /^(\d+)\s*([kMG]B)$/.exec(buffers); // the setting reads "128MB"
  const data = {
    memory: size ? `${size[1]} ${size[2]}` : "",
    aux: [...NAMED.filter((name) => running.has(name)), ...(io ? [`io workers × ${io}`] : [])],
    auxCount: processes.reduce((sum, [, count]) => sum + count, 0),
    files: TABLES.map((table) => files.find(([, name]) => name === table)).filter(Boolean),
  };
  // The scene has room for five chips and three short file paths; anything else stays captured.
  const fits =
    size && data.aux.length >= 1 && data.aux.length <= 5 && data.files.length === TABLES.length &&
    data.files.every(([path, , pretty]) => path.length <= 20 && pretty.length <= 8);
  if (!fits) throw new Error("the live server does not have the shape this scene draws");
  return data;
}

const steps = (d) => [
  { stop: "A box", title: "“The database”",
    note: `From the outside: one thing you send SQL to, and rows come back.` },
  { stop: "Processes", title: "Inside: ordinary processes",
    note: `Your client connects to the <b>postmaster</b>, which starts a <b>backend</b> process just for you. From then on the client talks only to its backend.` },
  { stop: "Storage", title: "The backend works on memory and disk",
    note: `It looks in <b>shared memory</b> first (${d.memory} here). What is not there is read from the table's <b>file on disk</b>.` },
  { stop: "More clients", title: "One backend per connection, one shared memory",
    note: `Every connection gets its own process. They all use the same memory and the same files — which is why they must coordinate.` },
  { stop: "Background", title: "Background processes keep it running", decisive: true,
    note: `${d.auxCount} more processes serve no client: they write changed data to disk, record every change, clean up, and read ahead.` },
];
const CSS = `
.lw .an svg { width:100%; height:auto; display:block; }
.lw .an text { font:600 14px system-ui, sans-serif; fill:var(--ink); text-anchor:middle; dominant-baseline:middle; }
.lw .an text.cap { font:600 11px system-ui, sans-serif; letter-spacing:.09em; fill:var(--mute); text-anchor:start; }
.lw .an text.lbl { font:500 12px system-ui, sans-serif; fill:var(--mute); }
.lw .an text.mono { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; text-anchor:start; font-weight:400; }
.lw .an text.mono.r { text-anchor:end; } .lw .an text.mono.dim { fill:var(--mute); }
.lw .an text.big { font:600 15px ui-monospace, Menlo, monospace; text-anchor:end; }

.lw .an .shell { fill:var(--panel); stroke:var(--line); stroke-width:1.5; }
.lw .an .zone { fill:var(--bg); stroke:var(--line); stroke-width:1; }
.lw .an .card rect { fill:var(--cell); stroke:transparent; stroke-width:1.5; filter:drop-shadow(0 2px 5px rgba(0,0,0,.22)); transition:fill .5s, stroke .5s; }
.lw .an .card.mine rect { fill:var(--accent-bg); stroke:var(--accent); }
.lw .an .card.mine text { fill:var(--accent); }
.lw .an .chip rect { fill:var(--cell); }
.lw .an .chip text { font:500 13px system-ui, sans-serif; }
.lw .an .blk { fill:var(--ok-bg); stroke:var(--ok); stroke-width:.8; }
.lw .an .filehit { fill:var(--hot-bg); }
.lw .an .filehit + text, .lw .an text.hot { fill:var(--hot); font-weight:600; }

.lw .an .edge { fill:none; stroke:var(--line); stroke-width:2; stroke-linecap:round; transition:stroke .5s; }
.lw .an .edge.dash { stroke-dasharray:2 7; }
.lw .an .new .edge { stroke:var(--accent); }
.lw .an .new text.lbl { fill:var(--accent); }
.lw .an .new .card:not(.mine) rect, .lw .an .new .chip rect { stroke:var(--accent); stroke-width:1.5; }
.lw .an .new .zone { stroke:var(--accent); }

.lw .an .st { opacity:0; transition:opacity .7s, transform .7s; transform:translateY(8px); }
.lw .an.r1 .s1, .lw .an.r2 .s2, .lw .an.r3 .s3, .lw .an.r4 .s4, .lw .an .s0.on { opacity:1; transform:none; }
.lw .an .lid { transition:opacity .8s, transform .8s; transform-origin:380px 313px; }
.lw .an .lid rect { fill:var(--accent); }
.lw .an .lid text { font:700 32px system-ui, sans-serif; fill:var(--accent-ink); letter-spacing:.06em; }
.lw .an .lid text.sub { font:500 15px system-ui, sans-serif; letter-spacing:0; opacity:.8; }
.lw .an.r1 .lid { opacity:0; transform:scale(1.03); pointer-events:none; }
`;
const card = (cls, x, y, w, t, h = 40) => `<g class="${cls}"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}"/><text x="${x}" y="${y + 1}">${t}</text></g>`;
// An edge; it is drawn in the accent colour while its step is the current one.
const edge = (d, { dash = false } = {}) => `<path class="edge ${dash ? "dash" : ""}" d="${d}"/>`;
const blocks = Array.from({ length: 22 }, (_, i) => `<rect class="blk" x="${270 + i * 17}" y="302" width="13" height="26" rx="3"/>`).join("");
const scene = (d) => `<svg viewBox="0 0 760 540">
  ${card("card mine", 340, 30, 150, "your client")}
  <g class="st s3" data-from="3">${card("card", 500, 30, 120, "client")}${card("card", 650, 30, 120, "client")}</g>
  <rect class="shell" x="10" y="96" width="740" height="434" rx="18"/>

  <g class="st s1" data-from="1">
    <rect class="zone" x="26" y="112" width="708" height="102" rx="12"/><text class="cap" x="42" y="131">PROCESSES</text>
    ${edge("M290 48 C210 64 130 96 122 150", { dash: true })}<text class="lbl" x="168" y="72">1 · connect</text>
    ${edge("M192 174 L276 174")}<text class="lbl" x="234" y="160">2 · starts</text>
    ${edge("M340 52 L340 152", { back: true })}<text class="lbl" x="398" y="76">3 · SQL ⇄ rows</text>
    ${card("card", 120, 174, 140, "postmaster")}${card("card mine", 340, 174, 124, "backend")}
  </g>
  <g class="st s3" data-from="3">
    ${edge("M500 52 L500 152", { back: true })}${edge("M650 52 L650 152", { back: true })}
    ${edge("M500 196 L500 268", { back: true })}${edge("M650 196 L650 268", { back: true })}
    ${card("card", 500, 174, 124, "backend")}${card("card", 650, 174, 124, "backend")}
  </g>
  <g class="st s2" data-from="2">
    ${edge("M340 196 L340 268", { back: true })}
    ${edge("M492 354 L492 402", { dash: true, back: true })}<text class="lbl" x="602" y="379">not in memory? read the file</text>
    <rect class="zone" x="250" y="270" width="484" height="82" rx="12"/><text class="cap" x="266" y="289">SHARED MEMORY</text>
    <text class="lbl" x="560" y="289">a backend looks here first</text>
    ${blocks}<text class="big" x="718" y="316">${d.memory}</text>
    <rect class="zone" x="250" y="404" width="484" height="112" rx="12"/><text class="cap" x="266" y="423">FILES ON DISK</text>
    ${d.files.map((file, i) => [...file, i === 0]).map(([f, t, sz, hit], i) => `${hit ? `<rect class="filehit" x="262" y="${434 + i * 24}" width="460" height="22" rx="5"/>` : ""}
      <text class="mono ${hit ? "hot" : "dim"}" x="272" y="${446 + i * 24}">${f}</text><text class="mono ${hit ? "hot" : ""}" x="440" y="${446 + i * 24}">${t}</text><text class="mono r ${hit ? "hot" : "dim"}" x="712" y="${446 + i * 24}">${sz}</text>`).join("")}
  </g>
  <g class="st s4" data-from="4">
    ${edge("M208 312 L248 312", { back: true, dur: 1.2 })}${edge("M208 460 L248 460", { back: true, dur: 1.2 })}
    <rect class="zone" x="26" y="232" width="180" height="284" rx="12"/><text class="cap" x="42" y="251">BACKGROUND</text>
    ${d.aux.map((a, i) => card("chip", 116, 286 + i * 44, 156, a, 30)).join("")}
  </g>
  <g class="lid"><rect x="10" y="96" width="740" height="434" rx="18"/><text x="380" y="300">THE DATABASE</text><text class="sub" x="380" y="336">SQL goes in, rows come out</text></g>
  <g class="st s0">${edge("M340 52 L340 94", { back: true, dur: 1.2 })}</g>
</svg>`;

function render({ model, el }) {
  let data = CAPTURED;
  let built = null;
  let root;
  const ui = stepper({
    el, model, label: "What a database is made of", css: CSS, steps: () => steps(data),
    draw({ at, body }) {
      if (built !== data) { body.innerHTML = `<div class="an">${scene(data)}</div>`; root = body.querySelector(".an"); built = data; }
      root.className = "an " + [1, 2, 3, 4].filter((n) => at >= n).map((n) => `r${n}`).join(" ");
      root.querySelectorAll(".st[data-from]").forEach((g) => g.classList.toggle("new", Number(g.dataset.from) === at));
      const outside = root.querySelector(".s0");
      outside.classList.toggle("on", at === 0);
      outside.classList.toggle("new", at === 0);
    },
  });
  ui.refresh();

  ui.setSource("loading");
  live(load, model?.get?.("jupyter")).then((fresh) => {
    ui.setSource(fresh ? "live" : "captured");
    if (!fresh || JSON.stringify(fresh) === JSON.stringify(data)) return;
    data = fresh;
    ui.refresh();
  });
  return () => ui.destroy();
}
export default { render };

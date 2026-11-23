// hw-machine — what any computer needs in order to work: a disk that keeps data with the power off,
// memory to work on it, a CPU that does the work, and a network between machines; then disk and
// memory side by side, and how little of one table PostgreSQL's memory for pages can hold.
import { arrow, extra, fmt, from, on, t, widget, zone } from "./col-lib.js";

// Measured 2026-11-23 from this page's cells, in the lesson app on the postgres lab: `df -h .` 741G;
// MemTotal 16,424,480 kB (about 16 GB); `nproc` 12; inet_client_addr 192.168.107.3,
// inet_server_addr 192.168.107.2; station_status 6,075 MB (777,595 pages); shared_buffers 128MB.
const CAPTURED = {
  diskGb: 741, memGb: 16, cores: 12, me: "192.168.107.3", db: "192.168.107.2",
  tableMb: 6075, pages: 777595, bufferMb: 128,
};

const steps = (D) => [
  { stop: "The needs", title: "What a program needs",
    note: "Any program, a database included, needs four things: somewhere to <b>keep</b> its data when the power is off, somewhere to <b>work</b> on it, something that <b>does</b> the work, and a way to <b>reach</b> other machines." },
  { stop: "Disk", title: "The disk keeps the data",
    note: `The disk keeps everything with the power off: ${D.diskGb} GB on this machine. It is large, cheap and permanent, and slow to reach.` },
  { stop: "Memory", title: "Memory is where data is worked on",
    note: `About ${D.memGb} GB here: far smaller than the disk. Memory is fast, costs far more for each gigabyte, and is <b>empty after a restart</b>. Data is copied into it from the disk.` },
  { stop: "CPU", title: "The CPU does the work",
    note: `${D.cores} cores here, each able to work on its own. The CPU works <b>only on what is in memory</b>: whatever sits on the disk must first be brought into memory.` },
  { stop: "Network", title: "Between machines, a network",
    note: `This lab is two machines, each with its own address. Your cells run on one; PostgreSQL runs on the other. Every query goes there and every result comes back over the network.` },
  { stop: "Disk vs memory", title: "Large and slow, small and fast", decisive: true,
    note: `<code>station_status</code> takes ${fmt(D.tableMb)} MB on disk. PostgreSQL keeps ${D.bufferMb} MB of memory for table data: about ${Math.round(100 * D.bufferMb / D.tableMb)}% of this one table fits at a time. The rest waits on the disk until a query needs it.` },
];

// A part is a faint outline until its step arrives, lit on its own step, plain after it.
const reached = [1, 2, 3, 4].flatMap((k) => [1, 2, 3, 4].filter((a) => a >= k).map((a) => `.lw .hm[data-at="${a}"] .p${k}`));
const CSS = extra("hm") + `
.lw .hm text.cap { font-size:12px; }
.lw .hm .part { opacity:.2; transition:opacity .6s; } ${reached.join(", ")} { opacity:1; }
.lw .hm .part .box, .lw .hm .part .pill { transition:fill .5s, stroke .5s; }
.lw .hm[data-at="1"] .p1 .box, .lw .hm[data-at="2"] .p2 .box, .lw .hm[data-at="3"] .p3 .box,
.lw .hm[data-at="4"] .p4 .pill { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .hm .core { fill:var(--panel); stroke:var(--line); }
.lw .hm[data-at="3"] .core { fill:var(--accent); stroke:var(--accent); opacity:.8; }
.lw .hm .ms { fill:var(--panel); stroke:var(--line); transition:fill .5s; }
.lw .hm[data-at="2"] .ms { fill:var(--accent); stroke:var(--accent); opacity:.55; }
.lw .hm .cyl { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .hm[data-at="1"] .cyl { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .hm .num { fill:var(--cell); stroke:var(--line); transition:fill .5s, stroke .5s; }
.lw .hm text.numt { font:700 12px system-ui, sans-serif; fill:var(--mute); }
${[1, 2, 3, 4].map((k) => `.lw .hm[data-at="${k}"] .n${k} .num { fill:var(--accent); stroke:var(--accent); }
.lw .hm[data-at="${k}"] .n${k} text.numt { fill:var(--accent-ink); }`).join("\n")}
.lw .hm text.ask { font:italic 500 14px system-ui, sans-serif; fill:var(--mute); }
.lw .hm .pk { opacity:0; } .lw .hm .pk.acc { fill:var(--accent); } .lw .hm .pk.ok { fill:var(--ok); }
.lw .hm[data-at="2"] .pk2, .lw .hm[data-at="3"] .pk3, .lw .hm[data-at="4"] .pkq { animation:hmGo 1.1s ease-in-out .4s 1 both; }
.lw .hm[data-at="4"] .pkr { animation:hmBack 1.1s ease-in-out 1.6s 1 both; }
@keyframes hmGo { 0% { transform:translateX(0); opacity:0 } 15%,85% { opacity:1 } 100% { transform:translateX(var(--d)); opacity:0 } }
@keyframes hmBack { 0% { transform:translateX(0); opacity:0 } 15%,85% { opacity:1 } 100% { transform:translateX(calc(-1 * var(--d))); opacity:0 } }
.lw .hm .card { fill:var(--cell); stroke:var(--line); }
.lw .hm .rule { stroke:var(--line); stroke-width:1; }
.lw .hm .dot.ok { fill:var(--ok); } .lw .hm .dot.hot { fill:var(--hot); }
.lw .hm .bar.tbl { fill:var(--hot); opacity:.85; } .lw .hm .tick { stroke:var(--panel); stroke-width:1.2; }
.lw .hm .guide { stroke:var(--accent); stroke-width:1.5; stroke-dasharray:3 4; fill:none; }
`;

// Columns of the machine: disk, memory, CPU, centred on these x.
const CX = [140, 380, 620];
const NEEDS = ["KEEP IT, POWER OFF", "WORK ON IT", "DO THE WORK"];
const ASK = [["Where is the data", "when the power is off?"], ["Where is it", "worked on?"], ["What does", "the work?"]];

// The need's number badge and caption above its column.
const need = (k, x, y, text) => `<g class="n${k}"><circle class="num" cx="${x}" cy="${y}" r="11"/>${t(x, y + 1, k, "numt")}</g>${t(x + 18, y + 1, text, "cap")}`;

// Under each part: its question until it arrives (step k), then its name and size.
const caption = (k, x, ask, name, size) => `${on(Array.from({ length: k }, (_, i) => i).join(" "),
  `${t(x, 200, ask[0], "ask")}${t(x, 220, ask[1], "ask")}`)}${from(k, `${t(x, 198, name, "h")}${t(x, 226, size, "huge")}`)}`;

const disk = (x) => `<g class="part p1">
  <path class="cyl" d="M${x - 60} 96 L${x - 60} 160 A60 14 0 0 0 ${x + 60} 160 L${x + 60} 96"/>
  <ellipse class="cyl" cx="${x}" cy="96" rx="60" ry="14"/>
  <path class="edge" d="M${x - 60} 118 A60 14 0 0 0 ${x + 60} 118 M${x - 60} 140 A60 14 0 0 0 ${x + 60} 140"/></g>`;

const memory = (x) => `<g class="part p2"><rect class="box" x="${x - 90}" y="94" width="180" height="76" rx="8"/>
  ${Array.from({ length: 16 }, (_, i) => `<rect class="ms" x="${x - 80 + (i % 8) * 20.5}" y="${106 + Math.floor(i / 8) * 28}" width="14" height="22" rx="2"/>`).join("")}</g>`;

const cpu = (D, x) => `<g class="part p3"><rect class="box" x="${x - 56}" y="78" width="112" height="104" rx="10"/>
  ${Array.from({ length: D.cores }, (_, i) => `<rect class="core" x="${x - 44 + (i % 4) * 23}" y="${88 + Math.floor(i / 4) * 30}" width="18" height="24" rx="3"/>`).join("")}</g>`;

// A small block that slides along an edge once, when its step is shown.
const packet = (cls, x, y, d, tone = "acc") => `<rect class="pk ${cls} ${tone}" x="${x}" y="${y - 6}" width="16" height="12" rx="3" style="--d:${d}px"/>`;

const machine = (D) => on("0 1 2 3 4", `${zone(14, 14, 732, 236, "THE MACHINE YOUR CELLS RUN ON")}
  ${NEEDS.map((n, i) => need(i + 1, CX[i] - 82, 62, n)).join("")}
  ${disk(CX[0])}${memory(CX[1])}${cpu(D, CX[2])}
  ${caption(1, CX[0], ASK[0], "disk", `${D.diskGb} GB`)}${caption(2, CX[1], ASK[1], "memory", `${D.memGb} GB`)}
  ${caption(3, CX[2], ASK[2], "CPU", `${D.cores} cores`)}
  ${from(2, `${arrow(212, 132, 282, 132, "on")}${packet("pk2", 212, 132, 54)}`)}
  ${from(3, `${arrow(476, 132, 556, 132, "on")}${packet("pk3", 476, 132, 62)}${t(516, 112, "only from", "lbl")}${t(516, 152, "memory", "lbl")}`)}`);

const network = (D) => on("0 1 2 3 4", `${zone(14, 262, 732, 86, "")}${need(4, 42, 282, "REACH OTHER MACHINES")}
  <g class="part p4"><rect class="pill" x="40" y="296" width="250" height="42" rx="21"/><rect class="pill" x="470" y="296" width="250" height="42" rx="21"/></g>
  ${on("0 1 2 3", `${t(380, 308, "How does it reach", "ask")}${t(380, 327, "data on another machine?", "ask")}`)}
  ${from(4, `${t(165, 309, "this machine · your cells", "lbl")}${t(165, 327, D.me, "big acc")}
    ${t(595, 309, "the database · PostgreSQL", "lbl")}${t(595, 327, D.db, "big acc")}
    <path class="edge on" d="M298 317 L462 317"/>${t(380, 302, "network", "lbl")}${t(380, 334, "query → · ← result", "lbl")}
    ${packet("pkq", 300, 317, 144)}${packet("pkr", 444, 317, 144, "ok")}`)}`);

// The last step's own layout: disk against memory, then the table against PostgreSQL's memory.
const ROWS = [[["keeps data with the power off", "ok"], ["empty after a restart", "hot"]], [["slow to reach", "hot"], ["fast to reach", "ok"]],
  [["cheap for each gigabyte", "ok"], ["costly for each gigabyte", "hot"]]];
const card = (x, c, name, gb) => `<rect class="card" x="${x}" y="48" width="342" height="150" rx="12"/>
  ${t(x + 20, 72, name, "h l")}${t(x + 322, 72, `${gb} GB`, `huge r ${c ? "acc" : ""}`)}<path class="rule" d="M${x + 20} 92 H${x + 322}"/>
  ${ROWS.map((r, i) => `<circle class="dot ${r[c][1]}" cx="${x + 26}" cy="${116 + i * 27}" r="4"/>${t(x + 40, 117 + i * 27, r[c][0], "l")}`).join("")}`;

const versus = (D) => { const W = 470, seg = W * D.bufferMb / D.tableMb, w = Math.max(3, seg);
  const ticks = Array.from({ length: Math.floor(D.tableMb / D.bufferMb) }, (_, i) => `M${170 + (i + 1) * seg} 264 v20`).join(" ");
  return on("5", `${zone(14, 14, 732, 196, "DISK AGAINST MEMORY")}${card(30, 0, "disk", D.diskGb)}${card(388, 1, "memory", D.memGb)}
  ${zone(14, 222, 732, 126, "ONE TABLE AGAINST THE MEMORY POSTGRESQL KEEPS FOR TABLE DATA")}
  ${t(30, 275, "the table", "l")}<rect class="bar tbl" x="170" y="264" width="${W}" height="20" rx="3"/><path class="tick" d="${ticks}"/>
  ${t(730, 275, `${fmt(D.tableMb)} MB`, "big r hot")}
  <path class="guide" d="M${170 + w} 286 V306"/>
  ${t(30, 319, "memory for it", "l")}<rect class="bar on" x="170" y="308" width="${w}" height="20" rx="3"/>
  ${t(186 + w, 319, `${D.bufferMb} MB — about ${Math.round(100 * D.bufferMb / D.tableMb)}% of the table`, "big l acc")}`); };

const scene = (D) => `<svg viewBox="0 0 760 360">${machine(D)}${network(D)}${versus(D)}</svg>`;

export default widget({ key: "hm", label: "What a computer needs", css: CSS, steps, scene, captured: CAPTURED });

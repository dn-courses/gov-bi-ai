// agc-cache — the unchanging start of every request, cached. The SQL agent with Pagila's tables and
// sample rows in its system prompt: what implicit caching gave on Vertex AI, why one changed line at
// the top ends a match, an explicit cache that every request reads, and what it saves.
import { esc, fmt, widget, zone } from "./ag1-lib.js";
import { CSS, key, src, stat, strip } from "./agc-lib.js";

// RECORDED 2026-11-23 with gemini-3.5-flash-lite on Vertex AI (global), the page's cells end to end
// (scratch rec22.py): prompt_token_count and cached_content_token_count of every request. Prices:
// Vertex AI pricing page, standard tier, global, checked 2026-11-23. Minimum and discount: the
// Vertex context-cache overview (4,096 tokens for Gemini 3 models; 90% off cached tokens).
const MODEL = "gemini-3.5-flash-lite";
const HEAD = 4357, CACHE = 4392, MIN = 4096;
const IMPLICIT = [["How many films are rated PG-13?", [[4401, 0], [4447, 0]]],
  ["Which customer has paid the most in total?", [[4400, 0], [4548, 4021]]],
  ["How many rentals were never returned?", [[4398, 0], [4441, 4019]]]];
const EXPLICIT = [["How many films are rated PG-13?", [[4401, CACHE], [4447, CACHE]]],
  ["Which customer has paid the most in total?", [[4400, CACHE], [4548, CACHE]]]];
const ERROR = "400 INVALID_ARGUMENT. Tool config, tools and system instruction should not be set in therequest when using cached content.";
const MONEY = { perRequest: 0.00118, perHour: 0.00436, breakEven: 3.7, fresh: 0.30, cached: 0.03, storage: 1.0 };

const steps = [
  { stop: "The start", title: "Every request starts with the same 4,357 tokens",
    note: `This agent's system prompt holds Pagila's tables with a few sample rows each, so it needs no <code>describe_table</code>. That start is the same on every request; only the list after it changes.` },
  { stop: "Implicit", title: "Implicit caching: Vertex AI looks for a recent request that began the same way",
    note: `On a hit, the matched tokens are billed at a tenth of the price and reported in <code>cached_content_token_count</code>. It is on by default, needs at least ${fmt(MIN)} tokens, and promises nothing: in this run 2 of 6 requests hit, and never the first request of a question.` },
  { stop: "One line", title: "A match runs from the first token and stops at the first difference",
    note: `Put a timestamp, a user's name or a request id at the top, and the very first tokens differ on every request. Nothing after them can match. Whatever changes goes after the part that does not.` },
  { stop: "Explicit", title: "An explicit cache: you create the start once, and requests point at it", decisive: true,
    note: `<code>client.caches.create</code> stores the system prompt and the tools for a time you choose. Every request that names the cache gets those ${fmt(CACHE)} tokens at the cached price, every time.` },
  { stop: "Frozen", title: "A cached start cannot be edited by a request",
    note: `Send a system prompt or tools beside the cache and the request is refused. To change the start, create a new cache. Per-request facts, such as today's date, belong in the question.` },
  { stop: "The saving", title: "What the cache saves, and what it does not",
    note: `Each request that reads the start from the cache saves $${MONEY.perRequest}; keeping it costs $${MONEY.perHour} an hour, so it pays for itself from about ${MONEY.breakEven} requests an hour. The list after the start is still paid in full on every request: caching the start and shrinking the list are two separate savings.` },
];

const hitCell = (n, c, tone) => (c ? `<td class="n ${tone}"><span class="meter"><i style="width:${(100 * c) / n}%"></i></span>${fmt(c)}</td>` : `<td class="n miss">—</td>`);
const reqs = (rows, hitTone = "ok") => `<table class="rqt"><tr><th>question</th><th>request</th><th>tokens in</th><th>from the cache</th></tr>${rows.map(([q, rs]) =>
  rs.map(([n, c], i) => `<tr class="${i ? "" : "first"}">${i ? "" : `<td rowspan="${rs.length}" class="q">${esc(q)}</td>`}<td>${i + 1}</td><td class="n">${fmt(n)}</td>${hitCell(n, c, hitTone)}</tr>`).join("")).join("")}</table>`;

const start = (hit) => strip([["the start", `${fmt(HEAD)} tokens · instructions, 15 tables, sample rows`, hit, 6], ["question", "", "said", 1], ["calls and results", "", "res", 2]]);
function sameStart() {
  return zone("Three requests of one question", [start(""), start(""), start("")].map((s, i) => `<p class="cap" style="margin:${i ? 10 : 0}px 0 4px">request ${i + 1}</p>${s}`).join("")
    + key([["", "the same on every request"], ["said", "the question"], ["res", "grows with the loop"]]));
}

const WORDS = ["You", "answer", "questions", "about", "the", "Pagila", "…"];
const LINES = [["the cached start", WORDS.map((w) => [w, "ok"]), "", ""],
  ["the same start, sent again", WORDS.map((w) => [w, "ok"]), "matches", "ok"],
  ["a timestamp added at the top", [["Now:", "hot"], ["09:14:02", "hot"], ...WORDS.map((w) => [w, "miss"])], "nothing matches", "hot"],
  ["the same timestamp, after the start", [...WORDS.map((w) => [w, "ok"]), ["Now:", "hot"], ["09:14:02", "hot"]], "the start matches", "ok"]];
function oneLine() {
  const row = (cells) => `<div class="toks">${cells.map(([l, t]) => `<span class="tok ${t}">${l}</span>`).join("")}</div>`;
  return zone("Tokens from the left: what can match a cached start", `<div class="lines">${LINES.map(([cap, cells, verdict, tone], i) =>
    `<div class="ln ${i ? "" : "ref"}"><p class="cap">${cap}</p>${row(cells)}${verdict ? `<span class="pill ${tone}">${verdict}</span>` : "<span></span>"}</div>`).join("")}</div>`)
    + src("a drawing of the rule, not a recording: matching is by prefix, from the first token");
}

const frozen = () => `<div class="frz"><div class="box ok"><p class="cap">the cache</p><b>system prompt + tools</b><span>${fmt(CACHE)} tokens, created once</span></div>
  <i>+</i><div class="box hot"><p class="cap">the request</p><b>a stamped system prompt</b><span>and the question</span></div><i>→</i><div class="box hot"><p class="cap">the answer</p><b class="hotc">400</b><span>refused</span></div></div>`;

function saving() {
  return `<div class="cols" style="--cols:1fr 1fr 1fr">${zone("Per request", stat(`$${MONEY.perRequest}`, `${fmt(HEAD)} tokens at $${MONEY.cached.toFixed(2)} instead of $${MONEY.fresh.toFixed(2)} per million`, "okc"))}
    ${zone("Per hour kept", stat(`$${MONEY.perHour}`, `storage, $${MONEY.storage.toFixed(2)} per million tokens an hour`, "hotc"))}
    ${zone("Break-even", stat(`${MONEY.breakEven}`, "requests an hour"))}</div>`;
}

function view(step, at) {
  const s = src(`recorded 2026-11-23 with ${MODEL} on Vertex AI; one run, cache counts are the API's own`);
  if (at === 0) return sameStart();
  if (at === 1) return zone("Implicit caching · nothing set up", reqs(IMPLICIT)) + s;
  if (at === 2) return oneLine();
  if (at === 3) return zone(`An explicit cache of ${fmt(CACHE)} tokens · kept 10 minutes`, reqs(EXPLICIT)) + s;
  if (at === 4) return frozen() + zone("The request, with a stamped system prompt beside the cache", `<pre class="hotc">${esc(ERROR)}</pre>`, "hot") + s;
  return saving() + src("list prices, Vertex AI global, standard tier, checked 2026-11-23");
}

const css = CSS + `
.lw .ag1 table.rqt { width:100%; border-collapse:collapse; font-size:15px; }
.lw .ag1 table.rqt th { text-align:left; color:var(--mute); font-size:12px; letter-spacing:.06em; text-transform:uppercase; padding:4px 12px 8px 0; }
.lw .ag1 table.rqt td { padding:7px 12px 7px 0; border-top:1px solid var(--line); }
.lw .ag1 table.rqt td.q { vertical-align:top; } .lw .ag1 table.rqt td.n { font:600 15px ui-monospace, Menlo, monospace; }
.lw .ag1 table.rqt td.ok { color:var(--ok); } .lw .ag1 table.rqt td.miss { color:var(--mute); }
.lw .ag1 table.rqt tr.first td { border-top:1.5px solid var(--line); }
.lw .ag1 .meter { display:inline-block; width:90px; height:8px; margin-right:10px; border-radius:4px; background:var(--cell); overflow:hidden; vertical-align:1px; }
.lw .ag1 .meter i { display:block; height:100%; background:var(--ok); animation:ag1-grow .6s both; transform-origin:left; }
.lw .ag1 .lines { display:grid; gap:12px; }
.lw .ag1 .ln { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 14px; align-items:center; padding:10px 12px; border-radius:10px; background:var(--cell); }
.lw .ag1 .ln .cap { grid-column:1 / -1; margin:0; } .lw .ag1 .ln.ref { background:transparent; border:1.5px dashed var(--line); }
.lw .ag1 .ln .pill { font-size:13px; }
.lw .ag1 .frz { display:grid; grid-template-columns:1fr auto 1fr auto .7fr; gap:10px; align-items:center; }
.lw .ag1 .frz > i { font-style:normal; font-size:24px; color:var(--mute); text-align:center; }
.lw .ag1 .frz .box { display:grid; gap:3px; padding:12px 14px; border-radius:12px; border:1.5px solid var(--line); background:var(--panel); animation:lw-in .4s both; }
.lw .ag1 .frz .box .cap { margin:0 0 2px; } .lw .ag1 .frz .box b { font-size:15px; } .lw .ag1 .frz .box span { font-size:13px; color:var(--mute); }
.lw .ag1 .frz .box b.hotc { font:700 26px/1.1 ui-monospace, Menlo, monospace; }
.lw .ag1 .frz .box.ok { border-color:var(--ok); } .lw .ag1 .frz .box.hot { border-color:var(--hot); }
.lw .ag1 .frz .box:nth-of-type(2) { animation-delay:.15s; } .lw .ag1 .frz .box:nth-of-type(3) { animation-delay:.3s; }
@container (max-width: 720px) { .lw .ag1 .frz { grid-template-columns:1fr; } .lw .ag1 .frz > i { display:none; } }
.lw .ag1 .toks { display:flex; flex-wrap:wrap; gap:5px; }
.lw .ag1 .tok { padding:5px 9px; border-radius:6px; font:13px ui-monospace, Menlo, monospace; background:var(--cell); border:1.5px solid var(--line); animation:lw-in .4s both; }
.lw .ag1 .tok.ok { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .ag1 .tok.hot { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .ag1 .tok.miss { opacity:.45; border-style:dashed; }
`;

export default widget({ label: "Caching the start", css, steps, view });

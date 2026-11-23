// agd-lib — what the SQL-agent widgets of the system prompt, the walkthrough, error recovery and
// task 1 share. It builds on ag1-lib's look (zones, captions, chips, bars, pills) and the shared chat
// widget, and adds: the prompt drawn as five blocks, a row of runs as dots with a key, SQL with its
// keywords tinted, and a verdict line. Nothing here holds lesson data: every recording lives in
// agd-recorded.json (see the comment at its top-level "about" key).
import { CHAT_CSS, conversation, wireChat } from "@widget-lib/chat.js";
import { stepper } from "@widget-lib/stepper.js";
import { CSS as AG1, esc, fmt, zone } from "./ag1-lib.js";
import REC from "./agd-recorded.json";

export { REC, esc, fmt, zone };
export const MODEL = REC.about.model;

export const CSS = CHAT_CSS + AG1 + `
.lw .agd .chat-log { padding:14px 16px 16px; gap:10px; }
.lw .agd .cols { align-items:start; }
.lw .agd .side { display:grid; gap:14px; min-width:0; align-content:start; }
.lw .agd .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.lw .agd .lead { font-size:15px; } .lw .agd .lead b { font-family:ui-monospace, Menlo, monospace; }
.lw .agd .zone.okz { border-color:var(--ok); background:linear-gradient(var(--ok-bg), var(--ok-bg)) padding-box, var(--panel); }

/* the prompt as blocks: one per part; the part taken out stays in place, dashed and struck */
.lw .agd .blocks { display:grid; gap:8px; }
.lw .agd .block { position:relative; display:grid; grid-template-columns:150px 1fr; gap:12px; align-items:start; padding:9px 12px; border-radius:10px;
  background:var(--cell); border:1.5px solid var(--line); transition:opacity .45s, border-color .45s; }
.lw .agd .block .nm { font:600 13px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .agd .block .nm small { display:block; margin-top:3px; font:12px system-ui, sans-serif; color:var(--mute); }
.lw .agd .block pre { padding:0; background:none; font-size:13px; line-height:1.45; color:var(--ink); }
.lw .agd .block .gone { display:none; }
.lw .agd .block.out { background:transparent; border-style:dashed; border-color:var(--hot); animation:agd-out .6s both; }
.lw .agd .block.out .nm { color:var(--hot); } .lw .agd .block.out .nm .pt { text-decoration:line-through; text-decoration-thickness:2px; }
.lw .agd .block.out .gone { display:inline-block; justify-self:end; align-self:center; padding:2px 10px; border-radius:999px; font:600 12px ui-monospace, Menlo, monospace;
  letter-spacing:.06em; text-transform:uppercase; color:var(--hot); background:var(--hot-bg); }
.lw .agd .blocks.terse .block pre { display:none; } .lw .agd .blocks.terse .block { grid-template-columns:1fr auto; }
@keyframes agd-out { from { border-style:solid; border-color:var(--line); background:var(--cell); } }

/* runs as dots: one per recorded run, green when right, with a key above */
.lw .agd .key { display:flex; gap:6px 14px; flex-wrap:wrap; margin:-2px 0 12px; font-size:13px; color:var(--mute); }
.lw .agd .key span { display:inline-flex; align-items:center; gap:6px; }
.lw .agd .key i, .lw .agd .dots i { display:inline-block; border-radius:50%; background:var(--cell); border:2px solid var(--line); }
.lw .agd .key i { width:12px; height:12px; }
.lw .agd .runs { display:grid; grid-template-columns:auto 1fr; gap:10px 16px; align-items:center; }
.lw .agd .runs .who { font-size:14px; color:var(--ink); } .lw .agd .runs .who b { font-weight:650; }
.lw .agd .dots { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.lw .agd .dots i { width:20px; height:20px; animation:lw-in .4s both; }
.lw .agd .key i.ok, .lw .agd .dots i.ok { background:var(--ok-bg); border-color:var(--ok); }
.lw .agd .key i.hot, .lw .agd .dots i.hot { background:var(--hot-bg); border-color:var(--hot); }
.lw .agd .dots span { margin-left:8px; font:600 15px ui-monospace, Menlo, monospace; }
.lw .agd .dots span small { font:13px system-ui, sans-serif; color:var(--mute); margin-left:2px; }

/* SQL, with keywords tinted and one part marked */
.lw .agd pre.sql { font-size:14px; line-height:1.55; }
.lw .agd pre.sql .kw { color:var(--accent); font-weight:600; }
.lw .agd pre.sql mark, .lw .agd pre mark { background:var(--hot-bg); color:var(--hot); font-weight:600; border-radius:3px; padding:0 2px; }
.lw .agd pre.sql mark.ok, .lw .agd pre mark.ok { background:var(--ok-bg); color:var(--ok); }
.lw .agd pre.sql mark .kw { color:inherit; }
.lw .agd .verdict { display:flex; align-items:center; gap:14px; font-size:15px; flex-wrap:wrap; }
.lw .agd .verdict b { font:700 22px ui-monospace, Menlo, monospace; }
.lw .agd .verdict .why { color:var(--mute); }
.lw .agd .tick { display:inline-grid; place-items:center; width:32px; height:32px; border-radius:50%; font-weight:700; background:var(--ok); color:var(--panel); flex:none; animation:lw-in .45s both; }
.lw .agd .tick.no { background:var(--hot); }

/* a trace: the tool calls of one run, in order */
.lw .agd .trace { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.lw .agd .trace .chip { font-size:13px; }
.lw .agd .trace i { font-style:normal; color:var(--mute); }

/* a Play button inside a step */
.lw .agd button.play { all:unset; cursor:pointer; pointer-events:auto; padding:6px 16px; border-radius:999px; background:var(--accent); color:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .agd button.play[disabled] { opacity:.45; cursor:default; }
.lw .agd .later { opacity:0; transform:translateY(6px); transition:opacity .45s, transform .45s; }
.lw .agd .later.on { opacity:1; transform:none; }
`;

// A widget: steps [{ stop, title, note, decisive? … }] and view(step, at) → HTML. `after(body, at)`
// runs once the step is drawn (to wire a Play button). Chat rows open and close by themselves.
export const widget = ({ label, css = "", steps, view, after }) => ({
  render({ model, el }) {
    const ui = stepper({
      el, model, label, css: CSS + css, steps: () => steps,
      draw({ at, body }) { body.innerHTML = `<div class="ag1 agd" data-at="${at}">${view(steps[at], at)}</div>`; wireChat(body); after?.(body, at); },
    });
    ui.show(Number(model?.get?.("start") ?? 0));
    return () => ui.destroy();
  },
});

// One recorded run as the shared chat widget draws it. `name` is an experiment of agd-recorded.json;
// its `shown` run is drawn unless `run` says which.
export const chatOf = (name, { run, open = [], upto, mark } = {}) => {
  const e = REC[name], messages = e.runs[run ?? e.shown].chat;
  return conversation(messages, { model: MODEL, recorded: true, open, upto: upto ?? messages.length, mark });
};
// The tool-call rows of a run, by index: open them all with `open: calls(name)`.
export const calls = (name, run) => { const e = REC[name]; return e.runs[run ?? e.shown].chat.flatMap((m, i) => (m.role === "tool" ? [i] : [])); };

// Every run of an experiment as a dot: green when `right(run)` holds. `label` names the row.
export const dots = (name, right, label) => {
  const runs = REC[name].runs, n = runs.filter(right).length;
  return `<span class="who">${label}</span><span class="dots">${runs.map((r, i) => `<i class="${right(r) ? "ok" : "hot"}" style="animation-delay:${i * 80}ms"></i>`).join("")}<span>${n}<small>of ${runs.length}</small></span></span>`;
};
export const runs = (...rows) => `<div class="runs">${rows.join("")}</div>`;
// What a green dot means, said once above the rows.
export const key = (green) => `<p class="key"><span><i class="ok"></i>${green}</span><span><i class="hot"></i>did not</span></p>`;
// A zone of dot rows: the question as its caption, the key, then the rows.
export const tally = (cap, green, ...rows) => zone(cap, key(green) + runs(...rows));

const KW = /\b(SELECT|FROM|JOIN|USING|ON|WHERE|GROUP BY|ORDER BY|LIMIT|AS|AND|OR|DESC|COUNT|SUM|count|sum|DELETE|IS NOT NULL|INTERVAL)\b/g;
// SQL with its keywords tinted; `mark` (a RegExp) marks a part in the warm colour, `good` in green.
// The marks are found in the plain text first, so a keyword inside them does not hide them.
export const sql = (text, { mark, good } = {}) => {
  let html = esc(text);
  if (mark) html = html.replace(mark, (hit) => `\u0001${hit}\u0002`);
  if (good) html = html.replace(good, (hit) => `\u0003${hit}\u0002`);
  html = html.replace(KW, `<span class="kw">$1</span>`);
  html = html.replace(/\u0001/g, "<mark>").replace(/\u0003/g, `<mark class="ok">`).replace(/\u0002/g, "</mark>");
  return `<pre class="sql">${html}</pre>`;
};

// The tool calls of a run as chips: list_tables → describe_table(film) → run_sql.
export const trace = (name, run) => {
  const e = REC[name], chat = e.runs[run ?? e.shown].chat.filter((m) => m.role === "tool");
  return `<div class="trace">${chat.map((m) => `<span class="chip ${m.error ? "hot" : m.name === "run_sql" ? "on" : ""}">${m.name}${
    m.name === "describe_table" ? `(${esc(m.args.table_name)})` : ""}</span>`).join("<i>→</i>")}</div>`;
};

export const verdict = (ok, big, text) => `<div class="verdict"><span class="tick ${ok ? "" : "no"}">${ok ? "✓" : "✗"}</span><b>${big}</b><span class="why">${text}</span></div>`;

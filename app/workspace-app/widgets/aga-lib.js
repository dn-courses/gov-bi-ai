// aga-lib — the opening widgets of the agents part, on Gemini. ag1-lib draws the look; this file
// draws what Gemini sends and returns, as google-genai shapes it:
//   - the list is `contents`: Content records with a role of "user" or "model", each holding parts;
//   - a part is text, a function_call (name, args as a dict, id) or a function_response (name,
//     response as a dict, the call's id). A function response travels in a "user" Content;
//   - the system instruction and the tool declarations are not in the list: they ride in `config`,
//     beside it, and are sent with every call all the same.
// GCSS also holds the shared look tweaks of the eight opening widgets (tinted zones, compact
// messages, stat tiles, numbered flows, lean bars); every one of them passes it as its css.
import { esc, json, sequence, talk, zone } from "./ag1-lib.js";

// The sessions on these pages were recorded on 2026-11-23 with this model (GEMINI_MODEL in the lab).
export const RECORDED_WITH = "gemini-3.5-flash-lite";
export const gtalk = (messages, options = {}) => talk(messages, { model: RECORDED_WITH, ...options });

export const GCSS = `
.lw .ag1 .zone { transition:border-color .4s, opacity .4s, background .4s; }
.lw .ag1 .zone.on { background:color-mix(in srgb, var(--accent) 6%, var(--panel)); }
.lw .ag1 .zone.hot { background:color-mix(in srgb, var(--hot) 6%, var(--panel)); }
.lw .ag1 .zone.ok { background:color-mix(in srgb, var(--ok) 6%, var(--panel)); }
.lw .ag1 .zone.on > .cap, .lw .ag1 .zone.hot > .cap, .lw .ag1 .zone.ok > .cap { color:var(--ink); }
.lw .ag1 .zone.on > .cap::before, .lw .ag1 .zone.hot > .cap::before, .lw .ag1 .zone.ok > .cap::before { content:""; display:inline-block; width:8px; height:8px; margin-right:8px; border-radius:50%; background:var(--accent); vertical-align:1px; }
.lw .ag1 .zone.hot > .cap::before { background:var(--hot); } .lw .ag1 .zone.ok > .cap::before { background:var(--ok); }
.lw .ag1 .zone.ghost { background:none; border-style:dashed; opacity:.5; display:grid; place-items:center; min-height:120px; color:var(--mute); font-size:14px; }

.lw .ag1 .msg { padding:6px 12px; }
.lw .ag1 .msg.model { border-left-color:var(--ok); } .lw .ag1 .msg.model .role { color:var(--ok); background:var(--ok-bg); }
.lw .ag1 .msg.fnresp { border-left-color:var(--hot); } .lw .ag1 .msg.fnresp .role { color:var(--accent); background:var(--accent-bg); }
.lw .ag1 .msg .kind { display:inline-block; margin-right:8px; padding:0 8px; border-radius:6px; font:12px ui-monospace, Menlo, monospace; color:var(--mute); border:1px solid var(--line); vertical-align:1px; }
.lw .ag1 .msg.fnresp .kind { color:var(--hot); border-color:var(--hot); }
.lw .ag1 .msg .call { margin-top:4px; padding:3px 9px; }
.lw .ag1 .resp { display:flex; flex-wrap:wrap; gap:4px 10px; margin-top:4px; padding:3px 9px; border-radius:8px; background:var(--panel); border:1px dashed var(--hot); font:14px ui-monospace, Menlo, monospace; }
.lw .ag1 .resp .fn { font-weight:700; }
.lw .ag1 .resp .cid, .lw .ag1 .call .cid { margin-left:auto; }
.lw .ag1 .cfg { display:flex; flex-wrap:wrap; gap:5px; align-items:center; margin-bottom:10px; padding:6px 8px; border-radius:10px; border:1px dashed var(--line); font-size:12px; color:var(--mute); }
.lw .ag1 .cfg .tag { font:600 12px ui-monospace, Menlo, monospace; letter-spacing:.04em; text-transform:uppercase; margin-right:4px; }
.lw .ag1 .cfg .chip { font-size:13px; padding:1px 8px; white-space:normal; overflow-wrap:anywhere; min-width:0; }

/* stat tiles: a label over a big number */
.lw .ag1 .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:8px; }
.lw .ag1 .stat { padding:8px 12px; border-radius:10px; background:var(--cell); border:1px solid var(--line); min-width:0; }
.lw .ag1 .stat span { display:block; font:12px ui-monospace, Menlo, monospace; color:var(--mute); overflow-wrap:anywhere; }
.lw .ag1 .stat b { display:block; overflow-wrap:anywhere; font:700 24px/1.2 ui-monospace, Menlo, monospace; }
.lw .ag1 .stats.rows { grid-template-columns:1fr; gap:6px; }
.lw .ag1 .stats.rows .stat { display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:5px 12px; }
.lw .ag1 .stats.rows .stat span { font-size:13px; } .lw .ag1 .stats.rows .stat b { font-size:20px; }
.lw .ag1 .stat.on { border-color:var(--accent); } .lw .ag1 .stat.on b { color:var(--accent); }

/* a numbered flow, one row a step */
.lw .ag1 .flow { display:grid; gap:6px; margin:0; padding:0; list-style:none; counter-reset:flow; }
.lw .ag1 .flow li { counter-increment:flow; display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:10px; background:var(--cell); font-size:15px; transition:background .4s, color .4s; }
.lw .ag1 .flow li::before { content:counter(flow); display:grid; place-items:center; flex:none; width:24px; height:24px; border-radius:50%; font:600 13px ui-monospace, Menlo, monospace; background:var(--panel); color:var(--mute); border:1px solid var(--line); }
.lw .ag1 .flow.on li { background:var(--accent-bg); color:var(--ink); }
.lw .ag1 .flow.on li::before { background:var(--accent); color:var(--accent-ink); border-color:var(--accent); }

/* bars with a short label: the track gets the room */
.lw .ag1 .lean .bar { grid-template-columns:130px 1fr 110px; }
.lw .ag1 .errbox { margin-top:10px; padding:8px 12px; border-radius:8px; border:1px solid var(--hot); border-left-width:4px; background:var(--hot-bg); color:var(--ink); font:13px/1.5 ui-monospace, Menlo, monospace; overflow-wrap:anywhere; }
.lw .ag1 .errbox b { color:var(--hot); }
.lw .ag1 .gap { display:grid; place-items:center; gap:4px; color:var(--hot); font:600 12px ui-monospace, Menlo, monospace; text-align:center; }
.lw .ag1 .gap i { font-style:normal; font-size:26px; line-height:1; }
`;

// A call id as Gemini returns it ("call_" and about 19 digits); the drawing keeps its start.
const short = (id) => (id && id.length > 12 ? id.slice(0, 10) + "…" : id);
const cid = (id, link) => (id ? `<span class="cid ${link ? "link" : ""}">id ${short(id)}</span>` : "");

export const fcall = (c, link) => `<div class="call"><span class="fn">${c.name}</span><span class="args">${esc(json(c.args))}</span>${cid(c.id, link)}</div>`;
export const fresp = (r, link) => `<div class="resp"><span class="fn">${r.name}</span><span>${esc(json(r.response))}</span>${cid(r.id, link)}</div>`;

// One Content: { role: "user" | "model", text?, calls?: [{ name, args, id }], resps?: [{ name, response, id }] }.
export function gmsg(m, state = "", link = false) {
  const kind = m.resps ? "fnresp" : m.role;
  const tag = m.resps ? "function_response" : m.calls ? "function_call" : "text";
  const text = m.text === undefined ? "" : `<div class="text">${esc(m.text)}</div>`;
  const parts = (m.calls ?? []).map((c) => fcall(c, link)).join("") + (m.resps ?? []).map((r) => fresp(r, link)).join("");
  return `<div class="msg ${kind} ${state}"><span class="role">${m.role}</span><span class="kind">${tag}</span>${text}${parts}</div>`;
}

export function gstack(list, upto = list.length, fresh = [], link = []) {
  const now = [].concat(fresh), linked = [].concat(link);
  return `<div class="stack">${list.slice(0, upto).map((m, i) => gmsg(m, now.includes(i) ? "fresh" : now.length ? "old" : "", linked.includes(i))).join("")}</div>`;
}

// What rides beside the list on every call.
export const config = (items) => `<div class="cfg"><span class="tag">config</span><span>sent with every call</span>${items.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;

// Stat tiles: [[label, value, on?]]; cls "rows" lays them out as label-and-value rows.
export const stats = (items, cls = "") => `<div class="stats ${cls}">${items.map(([label, value, on]) => `<div class="stat ${on ? "on" : ""}"><span>${label}</span><b>${value}</b></div>`).join("")}</div>`;

// A numbered flow of short rows; `on` lights them all.
export const flow = (items, on = false) => `<ol class="flow ${on ? "on" : ""}">${items.map((t) => `<li>${t}</li>`).join("")}</ol>`;

// The Gemini list as the chat widget's messages: a model call becomes a "Used <tool>" row, filled
// with the response that carries the same id once that response is within `upto`.
export function chatOfContents(list, upto = list.length) {
  const seen = list.slice(0, upto);
  return seen.flatMap((m) => {
    if (m.resps) return [];
    if (!m.calls) return [{ role: m.role === "model" ? "assistant" : "user", text: m.text ?? "" }];
    return m.calls.map((c) => {
      const back = seen.flatMap((r) => r.resps ?? []).find((r) => r.id === c.id);
      return { role: "tool", name: c.name, args: c.args, result: back ? json(back.response) : undefined };
    });
  });
}

// The agent loop in two panes that change together, on Gemini's list: the contents with their roles
// (and the config beside them), and the sequence diagram. step: { n, fresh, state }.
const STATES = ["thinking", "acting", "done"];
export function gpanes(list, events, step, at, cfg = []) {
  const states = `<div class="state"><span class="cap" style="margin:0">state</span>${STATES.map((s) => `<span class="pill ${s === step.state ? (s === "done" ? "ok" : "on") : ""}">${s}</span>`).join("")}</div>`;
  return `<div class="cols" style="--cols:minmax(0,.9fr) minmax(0,1.35fr)">
    ${zone(`The list · <b>contents</b> · ${step.n} items`, (cfg.length ? config(cfg) : "") + gstack(list, step.n, step.fresh))}
    ${zone("The loop · who sends what to whom", sequence(events, at) + `<div style="margin-top:10px">${states}</div>`)}</div>`;
}

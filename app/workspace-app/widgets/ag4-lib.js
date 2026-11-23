// ag4-lib — what the context / cost / safety / retrieval widgets of the agents part share: one
// stepped HTML scene whose parts persist between steps, and the few drawing pieces they reuse
// (a prompt drawn as a strip of blocks, bars to scale, a verdict chip). Conversations are not
// drawn here: they come from the shared chat widget (@widget-lib/chat.js).
import { CHAT_CSS, conversation, wireChat } from "@widget-lib/chat.js";
import { stepper } from "@widget-lib/stepper.js";

export const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const fmt = (n) => Number(n).toLocaleString("en-US");
export const pct = (part, whole) => `${Math.round((part / whole) * 100)}%`;

const CSS = `
.lw:has(.ag4) .source { display:none; }
.lw .ag4 { display:grid; gap:16px; container-type:inline-size; font-size:16px; }
.lw .ag4 .off { display:none !important; }
.lw .ag4 [data-from]:not(.off), .lw .ag4 [data-on]:not(.off) { animation: lw-in .4s both; }
.lw .ag4 .cols { display:grid; gap:16px; grid-template-columns:minmax(0,1fr) minmax(0,1fr); align-items:start; }
.lw .ag4 .cols.wide-left { grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); }
@container (max-width: 820px) { .lw .ag4 .cols { grid-template-columns:minmax(0,1fr) !important; } }
.lw .ag4 .zone { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px 16px; min-width:0; }
.lw .ag4 .cap { margin:0 0 10px; font-size:12px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ag4 .big { font:600 34px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace; }
.lw .ag4 .mid { font:600 22px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
.lw .ag4 .mono { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
.lw .ag4 .dim { color:var(--mute); } .lw .ag4 .acc { color:var(--accent); } .lw .ag4 .hot { color:var(--hot); } .lw .ag4 .ok { color:var(--ok); }
.lw .ag4 pre { margin:0; padding:10px 12px; border-radius:8px; background:var(--code); font:14px/1.45 ui-monospace, Menlo, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
.lw .ag4 mark { background:var(--hot-bg); color:var(--hot); font-weight:600; border-radius:3px; }
.lw .ag4 .chip { display:inline-block; padding:3px 11px; border-radius:999px; background:var(--cell); color:var(--mute); font-size:14px; font-weight:600; white-space:nowrap; }
.lw .ag4 .chip.ok { background:var(--ok-bg); color:var(--ok); } .lw .ag4 .chip.hot { background:var(--hot-bg); color:var(--hot); }
.lw .ag4 .chip.acc { background:var(--accent-bg); color:var(--accent); }
.lw .ag4 .sketch { font-size:13px; color:var(--hot); }
.lw .ag4 table { width:100%; border-collapse:collapse; font-size:15px; }
.lw .ag4 th { text-align:left; font-weight:600; color:var(--mute); font-size:12px; letter-spacing:.06em; text-transform:uppercase; padding:4px 12px 8px 0; }
.lw .ag4 td { padding:7px 12px 7px 0; border-top:1px solid var(--line); vertical-align:top; }
.lw .ag4 td.q { font:13.5px/1.4 ui-monospace, Menlo, monospace; overflow-wrap:anywhere; white-space:pre-wrap; }
.lw .ag4 tr.now td { background:var(--accent-bg); }

/* bars to scale */
.lw .ag4 .bars { display:grid; gap:8px; }
.lw .ag4 .bar { display:grid; grid-template-columns:minmax(120px, 26%) 1fr minmax(84px, auto); gap:12px; align-items:center; font-size:15px; }
.lw .ag4 .bar .track { display:flex; height:26px; border-radius:6px; background:var(--cell); overflow:hidden; }
.lw .ag4 .bar .seg { height:100%; background:var(--mute); transition:width .5s, background .4s, opacity .4s; }
.lw .ag4 .bar .seg.acc { background:var(--accent); } .lw .ag4 .bar .seg.hot { background:var(--hot); } .lw .ag4 .bar .seg.ok { background:var(--ok); }
.lw .ag4 .bar .seg.faint { opacity:.28; }
.lw .ag4 .bar .val { font:600 16px ui-monospace, Menlo, monospace; text-align:right; }
.lw .ag4 .legend { display:flex; flex-wrap:wrap; gap:6px 18px; font-size:13px; color:var(--mute); margin-top:10px; }
.lw .ag4 .legend i { display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:6px; vertical-align:-1px; background:var(--mute); }
.lw .ag4 .legend i.acc { background:var(--accent); } .lw .ag4 .legend i.hot { background:var(--hot); } .lw .ag4 .legend i.ok { background:var(--ok); }

/* a prompt as a strip of blocks, first token on the left */
.lw .ag4 .strip { display:flex; gap:4px; align-items:stretch; }
.lw .ag4 .blk { flex:1 1 0; min-width:0; padding:10px 8px; border-radius:8px; background:var(--cell); border:1.5px solid var(--line); text-align:center;
      font-size:14px; font-weight:600; transition:background .45s, border-color .45s, color .45s, flex-grow .45s, opacity .45s; }
.lw .ag4 .blk small { display:block; font-weight:500; font-size:12.5px; color:inherit; opacity:.85; margin-top:2px; }
.lw .ag4 .blk.cached { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .ag4 .blk.paid { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .ag4 .blk.new { background:var(--accent-bg); border-color:var(--accent); color:var(--accent); }
.lw .ag4 .blk.ghost { opacity:.25; }
.lw .ag4 button.blk { all:unset; box-sizing:border-box; cursor:pointer; flex:1 1 0; min-width:0; padding:10px 8px; border-radius:8px; background:var(--cell);
      border:1.5px solid var(--line); text-align:center; font-size:14px; font-weight:600; transition:background .45s, border-color .45s, color .45s; }
.lw .ag4 button.blk:focus-visible { box-shadow:0 0 0 2px var(--accent); }
.lw .ag4 .ruler { display:flex; justify-content:space-between; font-size:12.5px; color:var(--mute); margin-top:6px; }

/* a path of stations: what travels from where to where */
.lw .ag4 .path { display:flex; align-items:stretch; gap:0; }
.lw .ag4 .stn { flex:1 1 0; min-width:0; padding:10px 8px; border-radius:10px; background:var(--cell); border:1.5px solid transparent; text-align:center;
      font-size:14px; font-weight:600; color:var(--mute); transition:background .45s, border-color .45s, color .45s; }
.lw .ag4 .stn small { display:block; font-weight:500; font-size:12.5px; margin-top:2px; }
.lw .ag4 .stn.seen { color:var(--ink); }
.lw .ag4 .stn.now { background:var(--accent-bg); border-color:var(--accent); color:var(--accent); }
.lw .ag4 .stn.bad { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .ag4 .stn.good { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .ag4 .hop { flex:none; width:26px; align-self:center; height:2px; background:var(--line); transition:background .45s; }
.lw .ag4 .hop.seen { background:var(--accent); } .lw .ag4 .hop.bad { background:var(--hot); }
@container (max-width: 820px) { .lw .ag4 .path { flex-wrap:wrap; gap:6px; } .lw .ag4 .hop { display:none; } .lw .ag4 .stn { flex-basis:30%; } }
`;

// Which elements are on at step `at`: data-on="1 2", or data-from="2" (optionally data-until="4").
function reveal(root, at) {
  root.querySelectorAll("[data-on],[data-from]").forEach((node) => {
    const on = node.dataset.on !== undefined
      ? node.dataset.on.split(" ").map(Number).includes(at)
      : at >= Number(node.dataset.from) && at <= Number(node.dataset.until ?? 1e9);
    node.classList.toggle("off", !on);
  });
}

// A stepped scene built once: `scene()` returns its HTML, `after(root, at, ui)` runs on every step
// (set classes, widths, texts), `bind(root, ui)` once (clicks). Parts persist, so CSS does the motion.
export function staged({ key, label, css = "", steps, scene, after, bind }) {
  return {
    render({ model, el }) {
      let root = null;
      const ui = stepper({
        el, model, label, css: CSS + CHAT_CSS + css, steps: () => steps,
        draw({ at, body }) {
          if (!root) {
            body.innerHTML = `<div class="ag4 ${key}">${scene()}</div>`;
            root = body.firstElementChild;
            bind?.(root, ui);
          }
          root.dataset.at = at;
          reveal(root, at);
          after?.(root, at, ui);
        },
      });
      ui.show(Number(model?.get?.("start") ?? 0));
      return () => ui.destroy();
    },
  };
}

// Put the shared chat's conversation into `slot` (an element of the scene) for this step.
export function talk(slot, messages, view) {
  const key = JSON.stringify([messages.map((m) => (m.text ?? m.name).length), view.upto, view.open, String(view.mark)]);
  if (slot.dataset.key === key) return;
  slot.dataset.key = key;
  slot.innerHTML = conversation(messages, view);
  wireChat(slot);
}

// rows: [{ label, text, segs: [{ value, tone, faint }] }] drawn against one shared maximum.
export const bars = (rows, max) => `<div class="bars">${rows.map((r) => `<div class="bar" ${r.attrs ?? ""}><span>${r.label}</span>
  <span class="track">${r.segs.map((s) => `<span class="seg ${s.tone ?? ""} ${s.faint ? "faint" : ""}" ${s.attrs ?? ""} style="width:${(s.value / max) * 100}%"></span>`).join("")}</span>
  <span class="val">${r.text}</span></div>`).join("")}</div>`;

export const legend = (items) => `<div class="legend">${items.map(([tone, text]) => `<span><i class="${tone}"></i>${text}</span>`).join("")}</div>`;

// A path of stations with hops between them. `state(i)` → "", "seen", "now", "bad", "good".
export const path = (stations) => `<div class="path">${stations.map((s, i) =>
  `${i ? `<span class="hop" data-hop="${i}"></span>` : ""}<div class="stn" data-stn="${i}">${s[0]}<small>${s[1] ?? ""}</small></div>`).join("")}</div>`;
export function walk(root, states) {
  root.querySelectorAll("[data-stn]").forEach((node) => { node.className = `stn ${states[Number(node.dataset.stn)] ?? ""}`; });
  root.querySelectorAll("[data-hop]").forEach((node) => {
    const to = states[Number(node.dataset.hop)] ?? "";
    node.className = `hop ${to === "bad" ? "bad" : to ? "seen" : ""}`;
  });
}

// cards — what the full-width card widgets share: a card with a heading, labelled bars that grow
// when their step arrives, and small chips. Scoped to a widget's root class `k`.
import { fmt } from "./scene.js";

export const cards = (k) => `
.lw .${k} { display:grid; gap:14px; }
.lw .${k} .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
.lw .${k} h4 { margin:0 0 12px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .${k} .bars { display:grid; grid-template-columns:max-content 1fr max-content; gap:12px 14px; align-items:center; font-size:14px; }
.lw .${k} .r { display:contents; }
.lw .${k} .r > * { transition:opacity .6s; } .lw .${k} .r.st:not(.on) > * { opacity:0; }
.lw .${k} .lab { font-weight:600; } .lw .${k} .lab small { display:block; font:13px ui-monospace, Menlo, monospace; font-weight:400; color:var(--mute); }
.lw .${k} .track { height:16px; border-radius:8px; background:var(--cell); overflow:hidden; }
.lw .${k} .track i { display:block; height:100%; width:var(--w); border-radius:8px; background:var(--mute); transition:width .8s ease-out; }
.lw .${k} .r.st:not(.on) .track i { width:0; }
.lw .${k} .track i.acc { background:var(--accent); } .lw .${k} .track i.hot { background:var(--hot); } .lw .${k} .track i.ok { background:var(--ok); }
.lw .${k} .v { font:600 16px ui-monospace, Menlo, monospace; text-align:right; white-space:nowrap; }
.lw .${k} .v small { display:block; font:12px system-ui, sans-serif; font-weight:400; color:var(--mute); }
.lw .${k} .v.acc { color:var(--accent); } .lw .${k} .v.hot { color:var(--hot); } .lw .${k} .v.ok { color:var(--ok); }
.lw .${k} .say { margin:0; font-size:13px; color:var(--mute); }
.lw .${k} .chip { display:inline-block; padding:4px 12px; border-radius:999px; background:var(--cell); font:13px ui-monospace, Menlo, monospace; }
.lw .${k} .chip.acc { background:var(--accent-bg); color:var(--accent); } .lw .${k} .chip.hot { background:var(--hot-bg); color:var(--hot); }
.lw .${k} .chip.ok { background:var(--ok-bg); color:var(--ok); }
.lw .${k} button.play { padding:6px 16px; border-radius:999px; border:1px solid var(--accent); background:var(--accent); color:var(--accent-ink); font:600 14px system-ui, sans-serif; cursor:pointer; }
.lw .${k} button.play.quiet { background:transparent; color:var(--accent); }
`;

export const time = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} s` : ms >= 10 ? `${Math.round(ms)} ms` : `${ms} ms`);

// One labelled bar: `share` of the track (0–1), a value on the right. `on` is a reveal attribute, e.g. `data-from="2"`.
export const bar = ({ label, sub = "", share, value, small = "", colour = "", on = "" }) => `
  <div class="r st" ${on}><span class="lab">${label}${sub ? `<small>${sub}</small>` : ""}</span>
    <div class="track"><i class="${colour}" style="--w:${Math.max(0.5, Math.min(100, 100 * share))}%"></i></div>
    <span class="v ${colour}">${typeof value === "number" ? fmt(value) : value}${small ? `<small>${small}</small>` : ""}</span></div>`;

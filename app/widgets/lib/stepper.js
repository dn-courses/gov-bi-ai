// stepper — the click-through shell every lesson widget shares: a rail of steps, a title and note,
// Back/Next, ← → keys, light/dark, and a line saying whether the data is live or captured.
//
// A widget supplies its steps and a `draw` callback and owns only what is inside `body`. Styles are
// injected into `el` because the MyST theme renders an anywidget inside a shadow root, where page
// CSS cannot reach; for the same reason dark mode is mirrored from <html> by hand.

const CSS = `
.lw { --bg:#f7f8fa; --panel:#ffffff; --ink:#1c2430; --mute:#5f6b7a; --line:#d5dbe3; --cell:#e9edf2;
      --accent:#0b5f91; --accent-ink:#ffffff; --accent-bg:#dcecf7; --hot:#c2410c; --hot-bg:#fde3cf;
      --ok:#15803d; --ok-bg:#cdebd6; --code:#f0f3f7;
      font: 16px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color:var(--ink);
      background:var(--bg); border:1px solid var(--line); border-radius:12px; padding:18px 20px;
      margin:1.25rem 0; outline:none; }
.lw[data-dark="1"] { --bg:#161b22; --panel:#0f1318; --ink:#e6ebf1; --mute:#9aa7b6; --line:#313a46;
      --cell:#232b35; --accent:#58a6e0; --accent-ink:#0b1622; --accent-bg:#173449; --hot:#fb923c;
      --hot-bg:#4a2a14; --ok:#4ade80; --ok-bg:#17422a; --code:#1c232c; }
.lw *, .lw *::before { box-sizing:border-box; }
.lw:focus-visible { box-shadow:0 0 0 2px var(--accent); }

.lw .rail { display:flex; list-style:none; margin:0 0 18px; padding:0; }
.lw .rail li { flex:1; position:relative; text-align:center; margin:0; padding:0; }
.lw .rail li + li::before { content:""; position:absolute; top:13px; right:50%; width:100%;
      height:2px; background:var(--line); transition:background .35s; }
.lw .rail li.done::before, .lw .rail li.on::before { background:var(--accent); }
.lw .stop { all:unset; cursor:pointer; display:inline-flex; flex-direction:column; align-items:center;
      gap:6px; position:relative; z-index:1; font-size:13px; color:var(--mute); }
.lw .dot { width:28px; height:28px; border-radius:50%; border:2px solid var(--line);
      background:var(--bg); display:grid; place-items:center; font-size:12px; font-weight:600;
      transition:all .35s; }
.lw li.done .dot { border-color:var(--accent); color:var(--accent); }
.lw li.on .dot { border-color:var(--accent); background:var(--accent); color:var(--accent-ink);
      transform:scale(1.18); }
.lw li.on .stop { color:var(--ink); font-weight:600; }
.lw li.decisive.on .dot { border-color:var(--hot); background:var(--hot); }
.lw .stop:focus-visible .dot { box-shadow:0 0 0 3px var(--line); }

.lw .head { display:flex; gap:20px; align-items:flex-start; min-height:var(--head, 96px); margin-bottom:10px; }
.lw .say { flex:1; min-width:0; }
.lw .say h3 { margin:0 0 6px; font-size:21px; line-height:1.25; }
.lw .produces { margin:0 0 10px; font-size:14px; color:var(--mute); }
.lw .produces b { color:var(--accent); }
.lw .note { margin:0; }
.lw .badge { display:inline-block; margin:0 0 10px; padding:3px 10px; border-radius:999px;
      background:var(--hot-bg); color:var(--hot); font-size:13px; font-weight:600; }
.lw code { background:var(--code); padding:1px 5px; border-radius:4px; font-size:.9em; }
.lw .controls { display:flex; align-items:center; gap:10px; flex:none; }
.lw .controls button { all:unset; cursor:pointer; padding:7px 16px; border-radius:8px;
      border:1px solid var(--line); font-size:15px; font-weight:600; }
.lw .controls button.next { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); }
.lw .controls button[disabled] { opacity:.4; cursor:default; }
.lw .controls button:focus-visible { box-shadow:0 0 0 2px var(--accent); }
.lw .count { color:var(--mute); font-size:14px; }

.lw .foot { display:flex; justify-content:space-between; gap:12px; margin:10px 0 0;
      color:var(--mute); font-size:13px; }
.lw .source::before { content:"○ "; }
.lw .source[data-kind="live"] { color:var(--ok); }
.lw .source[data-kind="live"]::before { content:"● "; }

/* Hosted: a page drives the steps and shows its own rail, title and text; only the scene remains. */
.lw.hosted { border:0; padding:0; margin:0; background:transparent; }
.lw.hosted .rail, .lw.hosted .head, .lw.hosted .hint { display:none; }
.lw.hosted .foot { margin-top:14px; }

@keyframes lw-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
@media (max-width: 640px) {
  .lw .head { flex-direction:column; gap:10px; }
  .lw .stop span:last-child { display:none; }
  .lw .hint { display:none; }
}
@media (prefers-reduced-motion: reduce) { .lw * { animation:none !important; transition:none !important; } }
`;

const SOURCES = {
  captured: "captured data — lab database not reachable",
  loading: "captured data — asking the lab database…",
  live: "live from the lab database",
};

const clamp = (i, n) => Math.min(Math.max(Number.isFinite(i) ? i : 0, 0), n - 1);

// steps(): [{ stop, title, note, badge?, produces?, decisive? }] — a function, so a widget may
//          re-word its steps when live data arrives (the number of steps must not change).
// draw({ at, step, body }): put the scene for step `at` into `body`.
// Returns { body, show, refresh, setSource, still, destroy }.
//
// A page may host the widget instead of embedding it whole: it passes a `host` prop (an object)
// through the model. The shell then draws only the scene, hands the page `host.ready({ show,
// steps })` to drive it, and reports every step change with `host.at(index, steps)`.
export function stepper({ el, model, label, css = "", steps, draw }) {
  const style = document.createElement("style");
  style.textContent = CSS + css;
  const root = document.createElement("div");
  root.className = "lw";
  root.tabIndex = 0;
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", label);
  root.innerHTML = `
    <ol class="rail">${steps()
      .map(
        (s, i) => `<li class="${s.decisive ? "decisive" : ""}"><button class="stop" data-i="${i}">
          <span class="dot">${i + 1}</span><span>${s.stop}</span></button></li>`,
      )
      .join("")}</ol>
    <div class="head">
      <div class="say" aria-live="polite"></div>
      <div class="controls">
        <span class="count"></span><button class="back">← Back</button><button class="next">Next →</button>
      </div>
    </div>
    <div class="body"></div>
    <p class="foot"><span class="source"></span><span class="hint">click a step, or focus the widget and use ← →</span></p>`;
  el.append(style, root);
  const host = model?.get?.("host");
  if (host) root.classList.add("hosted");

  const pick = (sel) => root.querySelector(sel);
  const stops = [...root.querySelectorAll(".rail li")];
  const [say, body, back, next, count, source] = [".say", ".body", ".back", ".next", ".count", ".source"].map(pick);
  let at = clamp(Number(model?.get?.("start") ?? 0), stops.length);

  function show(i) {
    const all = steps();
    at = clamp(i, all.length);
    const step = all[at];
    stops.forEach((li, n) => {
      li.classList.toggle("done", n < at);
      li.classList.toggle("on", n === at);
    });
    say.innerHTML = `${step.badge ? `<span class="badge">${step.badge}</span>` : ""}
      <h3>${step.title}</h3>
      ${step.produces ? `<p class="produces">produces → <b>${step.produces}</b></p>` : ""}
      <p class="note">${step.note}</p>`;
    back.disabled = at === 0;
    next.disabled = at === all.length - 1;
    count.textContent = `${at + 1} / ${all.length}`;
    draw({ at, step, body });
    host?.at?.(at, all);
  }
  host?.ready?.({ show, steps });

  root.addEventListener("click", (e) => {
    const stop = e.target.closest(".stop");
    if (stop) show(Number(stop.dataset.i));
    else if (e.target.closest(".next") && !next.disabled) show(at + 1);
    else if (e.target.closest(".back") && !back.disabled) show(at - 1);
  });
  root.addEventListener("keydown", (e) => {
    if (host) return; // the hosting page owns the keys
    if (e.key === "ArrowRight") show(at + 1);
    else if (e.key === "ArrowLeft") show(at - 1);
    else return;
    e.preventDefault();
  });

  const html = document.documentElement;
  const syncTheme = () => root.setAttribute("data-dark", html.classList.contains("dark") ? "1" : "0");
  const watcher = new MutationObserver(syncTheme);
  watcher.observe(html, { attributes: true, attributeFilter: ["class"] });
  syncTheme();

  const setSource = (kind) => {
    source.dataset.kind = kind;
    source.textContent = SOURCES[kind];
  };
  setSource("captured");

  return {
    body,
    show,
    refresh: () => show(at),
    setSource,
    still: !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    destroy: () => watcher.disconnect(),
  };
}

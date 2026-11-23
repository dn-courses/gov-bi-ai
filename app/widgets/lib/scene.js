// scene — what the step-through SVG scenes share: one quiet look, step visibility, and the
// captured-then-live life cycle, so a widget is only its steps, its drawing and its loader.

// The shared look, scoped to a widget's root class `k`. Colours are the stepper's variables.
export const look = (k) => `
.lw .${k} svg { width:100%; height:auto; display:block; }
.lw .${k} text { font:600 14px system-ui, sans-serif; fill:var(--ink); text-anchor:middle; dominant-baseline:middle; }
.lw .${k} text.cap { font:600 12px system-ui, sans-serif; letter-spacing:.09em; fill:var(--mute); text-anchor:start; }
.lw .${k} text.lbl { font:500 13px system-ui, sans-serif; fill:var(--mute); }
.lw .${k} text.mono { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:400; }
.lw .${k} text.big { font:600 16px ui-monospace, Menlo, monospace; }
.lw .${k} text.l { text-anchor:start; } .lw .${k} text.r { text-anchor:end; } .lw .${k} text.dim { fill:var(--mute); }
.lw .${k} text.acc { fill:var(--accent); } .lw .${k} text.hot { fill:var(--hot); } .lw .${k} text.ok { fill:var(--ok); }
.lw .${k} .zone { fill:var(--panel); stroke:var(--line); stroke-width:1; }
.lw .${k} .box { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .5s, stroke .5s; }
.lw .${k} .box.blk { fill:var(--ok-bg); stroke:var(--ok); }
.lw .${k} .box.hit { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .${k} .box.warm { fill:var(--hot-bg); stroke:var(--hot); }
.lw .${k} .pill { fill:var(--cell); stroke:transparent; stroke-width:1.5; filter:drop-shadow(0 2px 5px rgba(0,0,0,.22)); transition:fill .5s, stroke .5s; }
.lw .${k} .pill.hit { fill:var(--accent-bg); stroke:var(--accent); }
.lw .${k} .edge { fill:none; stroke:var(--line); stroke-width:1.5; stroke-linecap:round; transition:stroke .5s; }
.lw .${k} .edge.on { stroke:var(--accent); stroke-width:2.5; }
.lw .${k} .bar { fill:var(--mute); } .lw .${k} .bar.on { fill:var(--accent); } .lw .${k} .bar.warm { fill:var(--hot); }
.lw .${k} .st { opacity:0; transition:opacity .6s; pointer-events:none; }
`;

// An element with class "st" is shown on the steps in data-on="2 3", or from step data-from="2" on.
function reveal(root, at) {
  root.querySelectorAll(".st").forEach((g) => {
    const on = g.dataset.on ? g.dataset.on.split(" ").map(Number).includes(at) : at >= Number(g.dataset.from ?? 0);
    g.style.opacity = on ? 1 : 0;
    g.classList.toggle("on", on); // for a widget's own entrance styles
  });
}

export const fmt = (n) => Number(n).toLocaleString("en-US");

// Build a widget's render(): draw from `captured` at once, then redraw if `load` answers differently.
// steps(data) and scene(data) are pure; `after(root, at)` runs once a step is on screen.
// A widget with nothing to load passes no `live`/`load`, and its data-source line is hidden.
export function scene({ stepper, live, key, label, css = "", steps, scene, captured = {}, load, after }) {
  const quiet = load ? "" : `.lw:has(.${key}) .source { display:none; }`; // scoped: a page may hold other widgets
  return ({ model, el }) => {
    let data = captured, built = null, root;
    const ui = stepper({
      el, model, label, css: look(key) + css + quiet, steps: () => steps(data),
      draw({ at, body }) {
        if (built !== data) { body.innerHTML = `<div class="${key}">${scene(data)}</div>`; root = body.querySelector("." + key); built = data; }
        root.dataset.at = at;
        reveal(root, at);
        after?.(root, at);
      },
    });
    ui.show(Number(model?.get?.("start") ?? 0));
    if (load) {
      ui.setSource("loading");
      live(load, model?.get?.("jupyter")).then((fresh) => {
        ui.setSource(fresh ? "live" : "captured");
        if (!fresh || JSON.stringify({ ...captured, ...fresh }) === JSON.stringify(data)) return;
        data = { ...captured, ...fresh };
        ui.refresh();
      });
    }
    return () => ui.destroy();
  };
}

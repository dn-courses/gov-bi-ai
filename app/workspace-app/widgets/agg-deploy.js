// agg-deploy — what `gcloud run deploy --source` does with the agent's folder: the folder is
// uploaded, Cloud Build builds its Dockerfile into an image, the image is stored in Artifact
// Registry, and Cloud Run starts it as a service with an address. ▶ Play sends the folder down
// the path once. No measured numbers: the files and the Dockerfile lines are the ones the page's
// cells write.
import { CSS as RAMP, arrow, chip, node, on, t, widget, zone } from "./ramp-lib.js";

const FILES = [["main.py", "serves the package"], ["Dockerfile", "how to build it"], ["requirements.txt", "what it imports"]];
const PKG = ["agent.py", "semantic.py", "model.yml"];
const DOCKER = ["FROM python:3.13-slim", "COPY requirements.txt .", "RUN pip install --no-cache-dir -r requirements.txt", "COPY . ."];
const STAGES = [
  { x: 30, label: "your folder", sub: "the deploy folder" },
  { x: 213, label: "Cloud Build", sub: "runs the Dockerfile" },
  { x: 396, label: "Artifact Registry", sub: "keeps the image" },
  { x: 579, label: "Cloud Run", sub: "starts the image" },
];
const W = 150, Y = 106, H = 64;

const steps = () => [
  { stop: "The folder", title: "A deploy starts from one folder",
    note: `The agent's package, and three files around it: <code>main.py</code> serves ADK's web server over the package, <code>requirements.txt</code> lists what it imports, and the <code>Dockerfile</code> says how to build it.` },
  { stop: "Build", title: "The folder becomes an image",
    note: `<code>--source</code> uploads the folder. Cloud Build runs the Dockerfile: a Python image, the packages installed, your files copied in. The image is stored in Artifact Registry.` },
  { stop: "Run", title: "The image becomes a service with an address", decisive: true,
    note: `Cloud Run starts the image, sets <code>PORT</code> and the environment you pass, and gives the service an HTTPS address. Press <b>Play</b> to send the folder down the path once.` },
  { stop: "A question", title: "A question to the service is a question to the same agent",
    note: `The service answers the same HTTP calls as the dev UI: create a session, then <code>POST /run</code> with the question. Inside, the same tools price and run the same SQL.` },
];

const CSS2 = `
.lw .agd text.cap { font-size:12px; }
.lw .agd text.h { font:650 15px system-ui, sans-serif; }
.lw .agd .tok { transition:transform .7s ease, opacity .4s; }
.lw .agd .tok rect { fill:var(--accent); } .lw .agd .tok text { fill:var(--accent-ink); font:650 13px system-ui, sans-serif; }
.lw .agd .play { cursor:pointer; pointer-events:auto; }
.lw .agd .play rect { fill:var(--accent); } .lw .agd .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .agd .play.busy { opacity:.45; pointer-events:none; }
.lw .agd .box.lit { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .agd .box.pkg { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1; opacity:.8; }
.lw .agd text.file { font:14px ui-monospace, Menlo, monospace; text-anchor:start; white-space:pre; fill:var(--ink); }
.lw .agd text.file.pkg { fill:var(--accent); }
.lw .agd .guide { stroke:var(--accent); stroke-width:1.5; stroke-linecap:round; fill:none; opacity:.6; }
.lw .agd .lead { stroke:var(--line); stroke-width:1; stroke-dasharray:2 4; }
.lw .agd text.code { fill:var(--ink); }
.lw .agd .url { opacity:0; transition:opacity .5s; }
.lw .agd .url.shown { opacity:1; }
.lw .agd .pill.ok { filter:none; }
`;

const stage = (s, i, lit) => `${node(s.x, Y, W, H, "", `${lit ? "lit" : ""} stage s${i}`)}
  ${t(s.x + W / 2, Y + 24, s.label, "h mid")}${t(s.x + W / 2, Y + 45, s.sub, "lbl mid")}`;
const link = (i, cls = "") => arrow(STAGES[i].x + W + 4, Y + H / 2, STAGES[i + 1].x - 5, Y + H / 2, cls);

const fileRow = ([f, what], i) => { const y = 72 + i * 38;
  return `${t(150, y, f, "file")}<path class="lead" d="M${158 + f.length * 8.4} ${y} L${404} ${y}"/>${t(414, y, what, "lbl l")}`; };

const folder = () => on("0", `${zone(120, 22, 520, 300, "THE FOLDER THAT IS DEPLOYED")}
  ${FILES.map(fileRow).join("")}
  <rect class="box pkg" x="138" y="168" width="484" height="138" rx="10"/>
  ${t(150, 190, "warehouse_agent/", "file pkg")}${t(608, 190, "the agent, as in the lab", "lbl r acc")}
  <path class="guide" d="M158 204 L158 ${222 + (PKG.length - 1) * 30}"/>
  ${PKG.map((f, i) => `<path class="guide" d="M158 ${222 + i * 30} L170 ${222 + i * 30}"/>${t(178, 222 + i * 30, f, "file pkg")}`).join("")}`);

const build = () => on("1", `${zone(14, 22, 732, 300, "BUILD")}${STAGES.slice(0, 3).map((s, i) => stage(s, i, i > 0)).join("")}
  ${link(0, "on")}${link(1, "on")}${t((STAGES[0].x + W + STAGES[1].x) / 2, Y - 14, "upload", "lbl mid")}
  <path class="guide" d="M${STAGES[1].x + W / 2} ${Y + H + 4} L${STAGES[1].x + W / 2} 200"/>
  <rect class="term" x="120" y="200" width="470" height="${DOCKER.length * 22 + 16}" rx="10"/>
  ${DOCKER.map((l, i) => t(136, 220 + i * 22, l, "code")).join("")}`);

const run = () => on("2", `${zone(14, 22, 732, 300, "THE WHOLE PATH")}${STAGES.map((s, i) => stage(s, i, i === 0)).join("")}
  ${link(0)}${link(1)}${link(2)}
  <g class="play"><rect x="30" y="54" width="100" height="34" rx="17"/><text x="80" y="72">▶ Play</text></g>
  <text class="lbl l now" x="146" y="72">not started</text>
  <g class="tok" style="transform:translate(0px,0px)"><rect x="${STAGES[0].x + 25}" y="${Y + H + 18}" width="100" height="28" rx="14"/><text class="tokl" x="${STAGES[0].x + 75}" y="${Y + H + 33}">the folder</text></g>
  <g class="url">${chip(STAGES[3].x - 20, Y + H + 18, W + 20, 32, "https://….run.app", "ok", "mono ok")}</g>`);

const ask = () => on("3", `${zone(14, 22, 732, 300, "A QUESTION TO THE SERVICE")}
  ${node(34, 128, 150, 64, "your cell", "you", "h")}
  ${node(298, 88, 200, 144, "", "lit")}${t(398, 114, "Cloud Run", "h mid")}
  ${chip(314, 140, 168, 30, "main.py → ADK", "", "lbl")}${chip(314, 182, 168, 30, "warehouse_agent", "", "mono")}
  ${node(596, 74, 136, 54, "Gemini", "them", "h")}${node(596, 192, 136, 54, "BigQuery", "them", "h")}
  ${arrow(188, 148, 292, 148)}${t(240, 134, "POST /run", "mono mid acc")}
  ${arrow(292, 174, 188, 174, "")}${t(240, 192, "events", "lbl mid")}
  ${arrow(502, 130, 590, 103, "")}${arrow(502, 190, 590, 217, "")}
  ${t(398, 278, "the same tools: priced first, refused above the limit", "lbl mid")}`);

const scene = () => `<svg viewBox="0 0 760 336">${folder()}${build()}${run()}${ask()}</svg>`;

const light = (root, n) => root.querySelectorAll(".st[data-on='2'] .stage").forEach((b, i) => b.classList.toggle("lit", i === n));
const move = (root, n, label) => { const tok = root.querySelector(".tok");
  tok.style.transform = `translate(${STAGES[n].x - STAGES[0].x}px,0px)`; root.querySelector(".tokl").textContent = label; light(root, n); };

function play(root) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const button = root.querySelector(".play"), now = root.querySelector(".now");
  const beats = [
    ["uploaded", () => move(root, 1, "the folder")],
    ["built from the Dockerfile", () => move(root, 2, "an image")],
    ["stored as an image", () => move(root, 3, "an image")],
    ["running: the service has an address", () => { root.querySelector(".tok").style.opacity = 0; root.querySelector(".url").classList.add("shown"); }],
  ];
  reset(root);
  button.classList.add("busy");
  beats.forEach(([say, act], i) => root._timers.push(setTimeout(() => {
    now.textContent = say; act(); if (i === beats.length - 1) button.classList.remove("busy");
  }, still ? 0 : 300 + i * 1000)));
}

function reset(root) {
  (root._timers || []).forEach(clearTimeout);
  root._timers = [];
  move(root, 0, "the folder");
  root.querySelector(".tok").style.opacity = 1;
  root.querySelector(".url").classList.remove("shown");
  root.querySelector(".now").textContent = "not started";
  root.querySelector(".play").classList.remove("busy");
}

function after(root) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector(".play").addEventListener("click", () => root.dataset.at === "2" && play(root));
  }
  reset(root);
}

export default widget({ key: "agd", label: "Deploying the agent", css: RAMP("agd") + CSS2, steps, scene, after });

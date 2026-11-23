// ramp-machines — the same script on machines that differ, then the environment shipped as an image.
// CAPTURED was read inside the course's app container (python --version, pandas.__version__, the
// Requires-Python of that pandas, /etc/os-release). The server's versions are an example, not a
// measurement: they are drawn as "an older server" and nothing is claimed about what it prints.
import { CSS, arrow, box, chip, node, on, svg, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = { os: "Debian 12", python: "3.13.18", pandas: "3.1.1", needs: "3.11", serverPython: "3.10" };

const steps = (D) => [
  { stop: "Two machines", title: "The same script, two machines",
    note: `The code is identical. What it runs on is not: pandas ${D.pandas} needs Python ${D.needs} or newer, so the server with Python ${D.serverPython} cannot even install what the laptop has.` },
  { stop: "A recipe", title: "A README describes the environment",
    note: `"Install this, then that, then set these variables." Every machine follows the recipe a little differently, and the recipe is out of date the day after it is written.` },
  { stop: "An image", title: "An image is the environment itself", decisive: true,
    note: `Instead of describing the environment, pack it: the operating system's files, the runtime, the libraries and the code, in one read-only <b>image</b>, built once.` },
  { stop: "Containers", title: "Every laptop runs the same image",
    note: `A <b>container</b> is a running copy of an image. Fourteen laptops start one each and nobody is asked which Python she has. The cell below prints the answer from inside it.` },
];

const machine = (x, name, lines, cls, verdict, vcls) => `
  ${zone(x, 40, 300, 250, name)}
  ${node(x + 30, 82, 240, 44, "report.py", "hit", "mono")}
  ${lines.map((l, i) => node(x + 30, 138 + i * 44, 240, 36, l, cls, "mono")).join("")}
  ${chip(x + 60, 236, 180, 36, verdict, vcls, vcls === "ok" ? "ok" : "hot")}`;

const LAYERS = (D) => [["the code", "report.py"], ["libraries", `pandas ${D.pandas} · …`], ["runtime", `Python ${D.python}`], ["OS files", D.os]];

const scene = (D) => svg(760, 340, `
  ${on("0 1", machine(40, "YOUR LAPTOP", [`Python ${D.python}`, `pandas ${D.pandas}`], "", "runs", "ok"))}
  ${on("0 1", machine(420, "AN OLDER SERVER", [`Python ${D.serverPython}`, "an older pandas"], "warm", "breaks, or differs", "warm"))}
  ${on("0", t(380, 165, "≠", "huge hot"))}
  ${on("1", `${node(290, 296, 180, 36, "README.md", "", "mono")}${arrow(330, 296, 250, 280, "")}${arrow(430, 296, 510, 280, "")}
    ${t(380, 150, "followed", "lbl")}${t(380, 170, "by hand,", "lbl")}${t(380, 190, "twice", "lbl")}`)}
  ${on("2 3", `${zone(40, 20, 300, 300, "ONE IMAGE — BUILT ONCE, READ-ONLY")}
    ${LAYERS(D).map(([k, v], i) => `${box(64, 56 + i * 62, 252, 50, i === 0 ? "hit" : "")}
      ${t(80, 74 + i * 62, k.toUpperCase(), "cap")}${t(190, 90 + i * 62, v, "mono")}`).join("")}`)}
  ${on("2", `${t(550, 130, "the environment is no longer", "h")}${t(550, 156, "described", "h hot")}
    ${t(550, 200, "it is", "h")}${t(550, 226, "shipped", "h acc")}`)}
  ${on("3", `${[0, 1, 2].map((i) => `${arrow(342, 170, 428, 70 + i * 100)}
      ${zone(432, 30 + i * 100, 290, 80, ["HER LAPTOP · WINDOWS", "HIS LAPTOP · MACOS", "THE PROJECTOR'S LAPTOP"][i])}
      ${chip(452, 58 + i * 100, 250, 38, `Python ${D.python} · pandas ${D.pandas}`, "ok", "mono")}`).join("")}`)}
`);

export default widget({ key: "rm", label: "The same environment everywhere", css: CSS("rm"), steps, scene, captured: CAPTURED });

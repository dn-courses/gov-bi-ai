// ramp-lab — the course's lab as what it is: one compose file, two containers, a private network
// and two published ports. The file drawn is the shape of labs/agents/compose.yml merged with
// labs/postgres/compose.app.yml (image names shortened; read in the repo, not invented). CAPTURED:
// the two addresses are what `inet_client_addr()` / `inet_server_addr()` returned in the preview lab.
import { CSS, arrow, chip, node, on, svg, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = { appIp: "192.168.155.3", dbIp: "192.168.155.2" };

const FILE = [
  "services:",
  "  app:",
  "    build: workspace-app",
  "    ports: [\"3000:3000\"]",
  "    environment:",
  "      PGHOST: postgres",
  "    depends_on:",
  "      postgres: {condition: service_healthy}",
  "  postgres:",
  "    image: pgvector/pgvector:pg16",
  "    ports: [\"5432:5432\"]",
  "    healthcheck: pg_isready",
];
// Which file lines each step is about.
const LIT = [[], [6, 7, 11], [5], [3, 10], []];

const steps = (D) => [
  { stop: "One file", title: "The lab is one file",
    note: `A <b>compose file</b> lists the containers the course needs and how they are wired. Two services: the pages you are reading, and the database their cells run on. The file is in the repository, so the environment is versioned with the course.` },
  { stop: "Up", title: "One command starts all of it",
    note: `<code>docker compose up</code> reads the file. The database starts first; the app waits until the database reports healthy, then starts.` },
  { stop: "By name", title: "Containers find each other by name",
    note: `Compose puts both on a private network of their own. The app does not know an address: it connects to the host called <code>postgres</code>. Here that was ${D.appIp} talking to ${D.dbIp}; on your laptop the cell prints yours.` },
  { stop: "Ports", title: "A published port is a door to the laptop", decisive: true,
    note: `Nothing outside reaches a container unless a port is published. <code>3000:3000</code> means "the laptop's port 3000 leads to the container's port 3000" — which is why the browser finds this page at <code>localhost:3000</code>.` },
  { stop: "Down", title: "Containers are disposable",
    note: `<code>docker compose down</code> removes both containers. The images and the compose file stay, so the next <code>up</code> builds the same lab again, on any laptop.` },
];

const file = () => `${zone(24, 16, 330, 330, "COMPOSE FILE")}
  ${FILE.map((l, i) => `<text class="code f${i}" x="40" y="${62 + i * 23}">${l.replace(/"/g, "&quot;")}</text>`).join("")}`;

const scene = (D) => svg(760, 362, `
  ${file()}
  ${on("0", `${t(556, 150, "two services", "num")}${t(556, 182, "app · postgres", "mono")}${t(556, 232, "nothing is installed on the laptop", "lbl")}${t(556, 254, "except Docker", "lbl")}`)}
  ${on("1 2 3", `${zone(376, 66, 360, 280, "PRIVATE NETWORK")}`)}
  ${on("1 2 3", `${node(410, 256, 292, 60, "postgres", "hit", "h acc")}${chip(586, 240, 104, 28, "healthy", "ok", "ok")}`)}
  ${on("1 2 3", `${node(410, 110, 292, 60, "app", "hit", "h acc")}`)}
  ${on("1", `${arrow(556, 254, 556, 174, "")}${t(626, 214, "then the app", "lbl")}${t(480, 214, "first", "lbl")}`)}
  ${on("2", `${arrow(556, 172, 556, 252)}${chip(466, 196, 180, 34, "postgres:5432", "hit", "mono")}`)}
  ${on("3", `${chip(392, 14, 150, 36, "your browser", "", "")}${arrow(467, 52, 467, 108)}${t(504, 62, ":3000", "mono acc")}
    ${chip(566, 14, 160, 36, "a SQL client", "", "")}<path class="edge on" d="M720 52 L720 286 L706 286"/>${t(690, 84, ":5432", "mono acc")}
    ${arrow(556, 172, 556, 252, "")}`)}
  ${on("4", `${zone(376, 66, 360, 280, "REMOVED")}${t(556, 150, "app", "h dim")}${t(556, 196, "postgres", "h dim")}
    ${t(556, 262, "the images stay", "h acc")}${t(556, 290, "the file stays", "h acc")}`)}
`);

const css = CSS("rl") + LIT.map((lines, at) => lines.map((i) => `.lw .rl[data-at="${at}"] text.f${i}`).join(",")).filter(Boolean)
  .map((sel) => `${sel} { fill:var(--accent); font-weight:700; }`).join("\n");

export default widget({ key: "rl", label: "The course lab", css, steps, scene, captured: CAPTURED });

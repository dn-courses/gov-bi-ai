// ramp-stack — a virtual machine carries its own kernel; a container borrows the host's.
// CAPTURED: read on the author's laptop (macOS, OrbStack as the Docker runtime) from the two
// containers of the preview lab — `uname -r` and /etc/os-release in each, `postgres --version`,
// `which python` (none) in the database container, `uname -r` on the host, and three runs of
// `time docker run --rm pgvector/pgvector:pg16 true` (0.29 s; 0.18-0.24 s with --entrypoint true);
// `docker images` for the sizes. A participant's laptop prints its own kernel — the same one twice.
// NOT measured: how long a virtual machine takes to boot; the widget says "typically".
import { CSS, box, chip, node, on, svg, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = {
  kernel: "7.2.12-orbstack", hostKernel: "Darwin 27.2.0", arch: "linux/arm64",
  app: ["Debian 12", "Python 3.13.18", "no PostgreSQL"], db: ["Debian 12", "PostgreSQL 16.16", "no Python"],
  start: "0.3 s", appImage: "1.62 GB", dbImage: "667 MB",
};

const steps = (D) => [
  { stop: "Virtual machines", title: "A virtual machine is a whole computer",
    note: `Each VM carries a complete guest operating system with its own kernel, on hardware the hypervisor pretends to give it. Strong walls, and a whole OS to boot and patch per application.` },
  { stop: "Containers", title: "A container is a process with walls around it",
    note: `No guest OS. Each container brings only its own files and libraries, and all of them call the <b>same Linux kernel</b>. The kernel keeps them apart: separate files, separate process lists, separate networks.` },
  { stop: "Proof", title: "Two containers, one kernel", decisive: true,
    note: `The lab is two containers with different contents: one has Python and no database, the other the reverse. Ask each for its kernel and both give the same answer.` },
  { stop: "On a laptop", title: "On macOS and Windows there is one small VM underneath",
    note: `Containers need a Linux kernel. A Mac's kernel is not Linux (the author's reports ${D.hostKernel}) and neither is Windows', so Docker runs one Linux VM and puts every container inside it — that is the kernel the cells just printed. Images are also built per processor type: these are <code>${D.arch}</code>.` },
  { stop: "What it buys", title: "What sharing the kernel buys",
    note: `Nothing boots, so a container starts about as fast as a program. The image is not small — but it is stored once, however many containers run from it.` },
];

const tower = (x, y, w, rows) => rows.map(([label, cls, tcls], i) => node(x, y + i * 42, w, 36, label, cls, tcls)).join("");

const vms = () => `${zone(30, 16, 700, 330, "ONE HOST — THREE VIRTUAL MACHINES")}
  ${[0, 1, 2].map((i) => `${box(58 + i * 222, 46, 200, 142, "")}
    ${tower(70 + i * 222, 56, 176, [[`app ${"ABC"[i]}`, "hit", "acc"], ["libraries", "", ""], ["guest OS + kernel", "warm", "hot"]])}`).join("")}
  ${node(58, 204, 644, 36, "hypervisor", "", "")}${node(58, 250, 644, 36, "host operating system", "", "")}
  ${node(58, 296, 644, 36, "hardware", "", "dim")}`;

const containers = () => `${zone(30, 16, 700, 330, "ONE HOST — THREE CONTAINERS")}
  ${[0, 1, 2].map((i) => `${box(58 + i * 222, 88, 200, 100, "")}
    ${tower(70 + i * 222, 98, 176, [[`app ${"ABC"[i]}`, "hit", "acc"], ["libraries", "", ""]])}`).join("")}
  ${node(58, 204, 644, 36, "container runtime (Docker)", "", "")}${node(58, 250, 644, 36, "one Linux kernel, shared", "ok", "ok")}
  ${node(58, 296, 644, 36, "hardware", "", "dim")}${t(380, 62, "no guest operating system", "lbl")}`;

const pair = (D) => `
  ${[["CONTAINER · app", D.app, 60], ["CONTAINER · postgres", D.db, 400]].map(([cap, rows, x]) => `${zone(x, 16, 300, 196, cap)}
    ${rows.map((r, i) => node(x + 30, 50 + i * 50, 240, 40, r, i === 2 ? "" : "hit", i === 2 ? "dim" : "mono")).join("")}
    <path class="edge on" d="M${x + 150} 214 L${x + 150} 262"/>`).join("")}
  ${node(60, 264, 640, 56, "", "ok", "")}${t(380, 282, "KERNEL — BOTH CONTAINERS REPORT", "cap mid")}
  ${t(380, 302, `Linux ${D.kernel}`, "num ok")}`;

const laptop = (D) => `${zone(30, 16, 700, 330, "YOUR LAPTOP — MACOS OR WINDOWS")}
  ${zone(70, 56, 620, 220, "ONE LINUX VM, RUN BY DOCKER")}
  ${node(100, 92, 250, 60, "container · app", "hit", "acc")}${node(410, 92, 250, 60, "container · postgres", "hit", "acc")}
  ${node(100, 180, 560, 44, `Linux ${D.kernel}`, "ok", "mono")}${t(380, 250, "on a Linux server this VM does not exist: the containers sit on the host's kernel", "lbl")}
  ${node(70, 292, 620, 38, "macOS or Windows", "", "")}`;

const buys = (D) => `
  ${zone(30, 16, 340, 330, "TIME TO START")}${t(200, 92, D.start, "huge ok")}${t(200, 124, "a container from the Postgres image", "lbl")}
  ${t(200, 146, "measured on the author's laptop", "lbl")}
  ${t(200, 228, "tens of seconds", "num")}${t(200, 256, "to minutes", "num")}${t(200, 286, "a virtual machine, typically", "lbl")}${t(200, 308, "not measured here", "lbl")}
  ${zone(390, 16, 340, 330, "SIZE ON DISK")}
  ${chip(420, 66, 280, 44, `app image · ${D.appImage}`, "", "mono")}${chip(420, 124, 280, 44, `postgres image · ${D.dbImage}`, "", "mono")}
  ${t(560, 208, "an image holds a whole", "lbl")}${t(560, 230, "userland — not megabytes", "lbl")}
  ${t(560, 278, "stored once", "h acc")}${t(560, 304, "every container adds only what it writes", "lbl")}`;

const scene = (D) => svg(760, 362, `${on("0", vms())}${on("1", containers())}${on("2", pair(D))}${on("3", laptop(D))}${on("4", buys(D))}`);

export default widget({ key: "rs", label: "Virtual machines and containers", css: CSS("rs"), steps, scene, captured: CAPTURED });

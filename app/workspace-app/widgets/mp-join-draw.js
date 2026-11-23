// mp-join-draw — the pictures of mp-join, one per step. Not a widget itself.
// The polls are drawn as each share's rows by system, to scale: a share is 300 minutes of the cells'
// rows, so 180,000 NYC, 75,000 CHI, 30,000 BOS and 15,000 PDX on every worker. The small table,
// station_counts, is split by arrival as the cell splits it: row i (NYC, CHI, BOS, PDX) on worker i.
import { OWNS, SYSTEMS, at, fmt, on, play, t, tag, tile, zone } from "./mp-lib.js";
import { table } from "@widget-lib/table.js";

export const SYS = SYSTEMS.map((s) => s[0]); // the arrival order, so count row i is on worker i
const STATIONS = Object.fromEntries(SYSTEMS.map((s) => [s[0], s[1]]));
export const ownerOf = (sys) => OWNS.indexOf(sys);
const COLX = (w) => 11 + w * 186, X0 = (w) => COLX(w) + 15, CX = (w) => COLX(w) + 90, BAR = 150;
const px = (D, sys) => (BAR * D.mix[sys]) / D.share;
const offset = (D, sys) => SYS.slice(0, SYS.indexOf(sys)).reduce((a, s) => a + px(D, s), 0);

// A share of the polls as one bar, a segment per system; `lit` names the systems drawn bright.
const segs = (D, x, y, h, lit) => SYS.map((s) =>
  `<rect class="seg k-${s} ${lit.includes(s) ? "" : "off"}" x="${x + offset(D, s)}" y="${y}" width="${px(D, s)}" height="${h}" rx="3"/>`).join("");
// One row of station_counts as a chip: the system and its number of stations.
export const chip = (sys, cls = "", attrs = "") => `<g class="k-${sys} ${cls}" ${attrs}><rect class="chip" width="84" height="24" rx="6"/>`
  + t(42, 13, `${sys} ${STATIONS[sys]}`, "v") + "</g>";
const legend = (x, y) => SYS.map((s, i) => `<g class="k-${s}"><circle class="dot" cx="${x + i * 64}" cy="${y}" r="5"/>`
  + t(x + i * 64 + 10, y + 1, s, "kt l") + "</g>").join("");
const head = (w, y) => tag(CX(w), y, `worker ${w}`);

// Step 0: each worker holds polls of every system and the count of one; only that one joins.
const holder = (D, w) => { const mine = SYS[w];
  return head(w, 54) + t(X0(w), 84, `polls · ${fmt(D.share)}`, "lbl l") + segs(D, X0(w), 94, 26, [mine])
    + table(X0(w), 164, ["system", "stations"], [[[mine, "chg"], STATIONS[mine]]], { cap: "station_counts" })
    + t(CX(w), 254, `joins ${fmt(D.mix[mine])}`, "big acc"); };
const apart = (D) => on("0", zone(11, 10, 738, 270, "BOTH TABLES, SPLIT BY ARRIVAL") + legend(476, 30)
  + [0, 1, 2, 3].map((w) => holder(D, w)).join("")
  + zone(11, 292, 738, 136, "JOINED WHERE THEY ARE")
  + t(27, 336, "polls that find their row", "l") + `<rect class="track" x="230" y="326" width="260" height="20" rx="10"/>`
  + `<rect class="fill in" x="230" y="326" width="${(260 * D.found) / D.rows}" height="20" rx="10"/>`
  + t(506, 337, fmt(D.found), "huge l acc") + t(626, 337, `of ${fmt(D.rows)}`, "lbl l")
  + t(27, 380, `the other ${fmt(D.rows - D.found)} polls have their row on another worker`, "l hot"));

// Step 1: every segment and chip travels to the owner of its system. Movable pieces sit at 0,0 and
// are placed by transform (mp-join's place()); here only their frames and the static parts.
export const SEG_Y = 76, INBOX_Y = 266, CHIP_Y = 110, LAND_Y = 340;
export const segFrom = (D, w, s) => [X0(w) + offset(D, s), SEG_Y];
export const segTo = (w, s) => [X0(ownerOf(s)), INBOX_Y + w * 17];
export const chipFrom = (w) => [X0(w), CHIP_Y];
export const chipTo = (w) => [X0(ownerOf(SYS[w])), LAND_Y];
const movers = (D) => [0, 1, 2, 3].map((w) => SYS.map((s) => `<g class="mv sg" data-w="${w}" data-s="${s}" ${at(...segFrom(D, w, s))}>`
  + `<rect class="seg k-${s}" width="${px(D, s)}" height="13" rx="3"/></g>`).join("")
  + chip(SYS[w], "mv cg", `data-w="${w}" ${at(...chipFrom(w))}`)).join("");
const ownerBox = (D, w) => head(w, 248) + t(COLX(w) + 138, 249, OWNS[w], `kt l k-${OWNS[w]}`)
  + t(CX(w), 382, `joins ${fmt(D.joinedShuffle[w])}`, `big aft ${w === 3 ? "hot" : "acc"}`);
const shuffleJoin = (D) => on("1", zone(11, 10, 738, 140, "SPLIT BY ARRIVAL") + legend(476, 30)
  + [0, 1, 2, 3].map((w) => head(w, 52) + `<rect class="dock" x="${X0(w)}" y="${SEG_Y - 2}" width="${BAR}" height="17" rx="4"/>`).join("")
  + `<rect class="net" x="11" y="158" width="738" height="36" rx="10"/><rect class="grow netfill" x="11" y="158" width="738" height="36" rx="10"/>`
  + t(27, 177, "NETWORK", "cap") + zone(11, 202, 738, 194, "SPLIT BY SYSTEM: EACH WORKER JOINS THE SYSTEM IT OWNS")
  + [0, 1, 2, 3].map((w) => ownerBox(D, w)).join("") + movers(D)
  + zone(11, 402, 738, 36) + t(27, 421, "sent to another worker", "lbl l") + t(220, 422, "0", "big l acc moved-n")
  + t(310, 421, `polls  +  ${D.countsShuffle} station counts`, "lbl l") + play(641, 404));

// Step 2: the polls stay; each count row is copied to the three other workers.
const slot = (w, i) => { const y = 134 + i * 30;
  return i === w ? `<g ${at(X0(w), y)}>${chip(SYS[i])}</g>`
    : `<rect class="dock" x="${X0(w)}" y="${y}" width="84" height="24" rx="6"/>`
      + `<g ${at(X0(w), y)}>${chip(SYS[i], "cp", `style="--dx:${COLX(i) - COLX(w)}px;--d:${120 + i * 260}ms"`)}</g>`; };
const stayer = (D, w) => head(w, 54) + t(X0(w), 84, `polls · ${fmt(D.share)} · stay`, "lbl l") + segs(D, X0(w), 94, 26, SYS)
  + [0, 1, 2, 3].map((i) => slot(w, i)).join("");
const sentRow = (y, label, w, value, cls) => t(27, y, label, "l") + `<rect class="track" x="170" y="${y - 9}" width="300" height="18" rx="9"/>`
  + `<rect class="fill in ${cls}" x="170" y="${y - 9}" width="${Math.max(4, w)}" height="18" rx="9"/>` + t(484, y + 1, value, "big l");
const broadcastJoin = (D) => on("2", zone(11, 10, 738, 262, "THE POLLS STAY; THE SMALL TABLE IS COPIED TO EVERY WORKER")
  + [0, 1, 2, 3].map((w) => stayer(D, w)).join("")
  + zone(11, 284, 738, 152, "SENT TO ANOTHER WORKER: POLLS + STATION COUNTS")
  + sentRow(328, "shuffle join", 300, `${fmt(D.pollsShuffle)} + ${D.countsShuffle}`, "hotf")
  + sentRow(366, "broadcast join", (300 * D.countsBroadcast) / D.pollsShuffle, `0 + ${D.countsBroadcast}`, "")
  + t(27, 412, `broadcast sends less while the small side has under ${fmt(D.breakEven)} rows`, "l acc")
  + play(641, 312));

// Step 3: both tables stored split by system: every worker already has its system's rows.
const keeper = (D, w) => { const s = OWNS[w], n = D.joinedShuffle[w];
  return head(w, 54) + t(COLX(w) + 138, 55, s, `kt l k-${s}`) + t(X0(w), 84, `polls · ${fmt(n)}`, "lbl l")
    + `<rect class="seg k-${s}" x="${X0(w)}" y="94" width="${(BAR * n) / D.joinedShuffle[3]}" height="26" rx="3"/>`
    + `<g ${at(X0(w), 140)}>${chip(s)}</g>` + t(CX(w), 196, `joins ${fmt(n)}`, "big acc"); };
const colocated = (D) => on("3", zone(11, 10, 738, 240, "BOTH TABLES STORED SPLIT BY SYSTEM") + legend(476, 30)
  + [0, 1, 2, 3].map((w) => keeper(D, w)).join("") + t(380, 230, "the shuffle was done when the tables were written", "lbl")
  + zone(11, 262, 738, 84) + tile(27, 292, "SENT TO ANOTHER WORKER", `${D.pollsColocated} + ${D.countsColocated}`, "acc")
  + tile(380, 292, "THE SAME ROWS AS THE SHUFFLE JOIN", D.same ? "True" : "False", "ok"));

export const scene = (D) => `<svg viewBox="0 0 760 440">${apart(D)}${shuffleJoin(D)}${broadcastJoin(D)}${colocated(D)}</svg>`;

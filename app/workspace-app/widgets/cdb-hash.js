// cdb-hash — why a deterministic hash is not protection for a nine-digit identifier: it keeps joins
// working, and the whole input space can be hashed in about a minute.
// `guesses` and `seconds` are the page's Python cell, run in the lesson app on 2026-11-21 (one core,
// Python 3.13, hashlib): 1,234,568 candidates hashed and compared in 0.9 s. The identifiers are invented.
import { arrow, bar, box, extra, fmt, on, pill, t, widget, zone } from "./cdb-lib.js";

const CAPTURED = { guesses: 1234568, seconds: 0.9, valid: 100000000 };
const minutes = (D) => Math.max(1, Math.round((D.seconds / D.guesses) * D.valid / 60));

const steps = (D) => [
  { stop: "The pitch", title: "A hash keeps the column useful",
    note: `The SHA-256 masking rule returns the same token for the same input. An analyst can still count distinct citizens and join two tables on the masked column, and never sees an identifier. That is the whole attraction.` },
  { stop: "Nine digits", title: "The same property undoes it", decisive: true,
    note: `An Israeli identity number is nine digits, and the ninth is a check digit: <b>${fmt(D.valid)}</b> valid numbers. Hash every one of them once, and each token in the table points back at its number. This page's cell does ${fmt(D.guesses)} in ${D.seconds} s on one core: about ${minutes(D)} minute for all of them.` },
  { stop: "Instead", title: "Pseudonymous is not protected",
    note: `A deterministic hash of a small input space hides nothing from someone who wants to look. To let analysts join without seeing identifiers, give them something that cannot be recomputed from the identifier alone.` },
];

const CSS = (k) => extra(k) + `
.lw .${k} text.tok { font:13px ui-monospace, Menlo, monospace; font-weight:400; fill:var(--accent); }
`;

// Invented identifiers (valid check digits) and the first eight hex digits of their real SHA-256.
const IDS = [["012345674", "b118beac…"], ["038457214", "a7a31133…"], ["054982715", "fdc9fd9b…"]];

const scene = (D) => `<svg viewBox="0 0 760 372">
  ${on("0", zone(14, 10, 340, 352, "citizens — WHAT THE ANALYST SEES") + zone(406, 10, 340, 352, "benefits — WHAT THE ANALYST SEES")
    + IDS.map(([, tok], i) => box(40, 56 + i * 56, 288, 40, "", i === 0 ? "hit" : "") + t(184, 77 + i * 56, tok, "tok")
      + box(432, 56 + ((i + 1) % 3) * 56, 288, 40, "", i === 0 ? "hit" : "") + t(576, 77 + ((i + 1) % 3) * 56, tok, "tok")).join("")
    + arrow(332, 76, 428, 132) + t(380, 86, "equal", "acc")
    + t(184, 256, "COUNT(DISTINCT national_id)", "mono") + t(184, 282, "still correct", "ok")
    + t(576, 256, "JOIN … USING (national_id)", "mono") + t(576, 282, "still matches", "ok")
    + t(380, 334, "the tokens above are shortened; the identifiers behind them are invented", "lbl"))}

  ${on("1", zone(14, 10, 732, 352, "THE INPUT SPACE AGAINST THE OUTPUT SPACE")
    + t(40, 62, "possible SHA-256 outputs", "l") + bar(300, 52, 420, "ghost", 20) + t(40, 86, "2 to the power 256: nobody searches this", "lbl l")
    + t(40, 130, "possible identity numbers", "l hot") + bar(300, 120, 3, "warm", 20) + t(312, 131, fmt(D.valid), "big l hot")
    + t(40, 154, "somebody can simply try them all", "lbl l")
    + pill(40, 196, 150, 40, "000000018", "", "mono") + pill(40, 244, 150, 40, "000000026", "", "mono") + t(115, 300, "… every valid number", "lbl")
    + arrow(196, 240, 268, 240) + pill(276, 218, 130, 44, "SHA-256", "", "") + arrow(412, 240, 484, 240)
    + pill(492, 218, 228, 44, "token → number", "warm", "hot") + t(606, 284, "a lookup table for the whole column", "lbl")
    + t(606, 330, `about ${minutes(D)} minute`, "huge hot"))}

  ${on("2", zone(14, 10, 732, 352, "WHAT TO GIVE THE ANALYST INSTEAD")
    + pill(40, 54, 300, 46, "a surrogate key", "ok", "ok") + t(190, 126, "a meaningless number the warehouse", "lbl") + t(190, 146, "assigns: the data-warehousing module's", "lbl") + t(190, 166, "dimension key. Joins work; nothing to invert.", "lbl")
    + pill(420, 54, 300, 46, "a keyed hash", "ok", "ok") + t(570, 126, "a custom masking routine that mixes in", "lbl") + t(570, 146, "a secret the analyst does not hold.", "lbl") + t(570, 166, "Without the key, the table cannot be built.", "lbl")
    + pill(40, 226, 680, 46, "plain SHA-256 of a low-entropy identifier", "warm", "hot")
    + t(380, 298, "fine for a long random token; not for an identity number, a phone number, a date of birth", "lbl")
    + t(380, 336, "The masking rule is not broken. The identifier is too small for it.", ""))}
</svg>`;

export default widget({ key: "hs", label: "Hash masking and a nine-digit identifier", css: CSS("hs"), steps, scene, captured: CAPTURED });

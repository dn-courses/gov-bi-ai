// ag7-callers — who may call the deployed agent, the instructor's service agent-preview. Facts re-read
// 2026-11-23 (Cloud Run managing-access, troubleshooting, IAP for Cloud Run, secure-by-default
// organisations). The 403 and the 200 were recorded against agent-preview on 2026-11-23 from the
// instructor's notebook (no token, then an identity token for a project owner); agent-preview has no
// invoker binding, so only the project's owners may call it. The colleague, the sign-in page
// (Identity-Aware Proxy) and the public grant are drawn from Google's documentation, not run.
import { CSS, arrow, chip, line, lit, node, on, from, svg, t, widget, zone } from "./ag7-lib.js";

const steps = () => [
  { stop: "No token", title: "A request with no token is refused",
    note: `<code>agent-preview</code> was deployed private (<code>--no-allow-unauthenticated</code>). A request without a token got <b>403</b>, before any of the agent's code ran. A person who opens the URL in a browser gets the same 403: the browser sends no token.` },
  { stop: "Token", title: "An identity token for a permitted account passes",
    note: `The instructor's notebook asked Google for an identity token for the service's URL and sent it. Cloud Run checked that the account may invoke this service (a project owner may), and the request reached the agent: <b>200</b>.` },
  { stop: "One more", title: "One more person: grant the invoker role", decisive: true,
    note: `No one else holds that right yet, which is why your own token gets 403. To let a colleague call it, grant her account <i>Cloud Run Invoker</i> (<code>roles/run.invoker</code>) on this one service. Her program then sends her own identity token, exactly as the instructor's did.` },
  { stop: "Sign-in", title: "A sign-in page in front of the service",
    note: `People in a browser do not fetch tokens. <b>Identity-Aware Proxy</b> (IAP) puts a sign-in page in front: they sign in with their organisation account, IAP checks that the account holds <i>IAP-secured Web App User</i>, and passes the request on with signed headers that tell the service who signed in.` },
  { stop: "Public?", title: "“Just make it public” is usually refused",
    note: `Making it public means granting the invoker role to <code>allUsers</code>. An organisation policy called <b>domain-restricted sharing</b> refuses grants to anyone outside the organisation; Google enforces it by default on organisations created since May 2024. Cloud Run has a second switch, turning the invoker check off, which opens the service anyway. Expect to be asked why you need either.` },
];

const ROW = [40, 116, 192, 268], H = 52, DOOR = 404, SVC = [572, 150, 164, 70];
const caller = (r, title, sub) => `${node(24, ROW[r], 230, H, "")}${t(139, ROW[r] + 19, title, "h")}${t(139, ROW[r] + 38, sub, "lbl")}`;
const toService = (r) => arrow(DOOR + 18, ROW[r] + H / 2, SVC[0] - 2, SVC[1] + SVC[3] / 2, "");

const scene = () => svg(760, 430, `
  <rect class="wall" x="${DOOR}" y="30" width="16" height="300" rx="4"/>
  ${t(DOOR + 8, 346, "Cloud Run: may this account invoke?", "lbl")}
  ${node(...SVC, "agent-preview", "you", "h")}

  ${lit("0", `${caller(0, "no token", "a script, or a browser")}${arrow(254, ROW[0] + 26, DOOR - 4, ROW[0] + 26, "")}`)}
  ${chip(DOOR + 26, ROW[0] + 8, 120, 36, "403", "warm", "h")}

  ${from("1", lit("1", `${caller(1, "the instructor", "a project owner's token")}${arrow(254, ROW[1] + 26, DOOR - 4, ROW[1] + 26, "")}${toService(1)}`))}
  ${from("1", chip(292, ROW[1] - 4, 64, 26, "200", "ok", "h"))}

  ${from("2", lit("2", `${caller(2, "a colleague", "her own identity token")}${arrow(254, ROW[2] + 26, DOOR - 4, ROW[2] + 26, "")}${toService(2)}
    ${t(329, ROW[2] + 44, "+ Cloud Run Invoker", "tag")}`))}
  ${from("2", chip(292, ROW[2] - 4, 64, 26, "200", "ok", "h"))}

  ${from("3", lit("3", `${caller(3, "a person", "in a browser")}
    ${node(282, ROW[3] - 6, 104, 64, "")}${t(334, ROW[3] + 16, "sign-in", "h")}${t(334, ROW[3] + 38, "page (IAP)", "lbl")}
    ${arrow(254, ROW[3] + 26, 280, ROW[3] + 26, "")}${line(386, ROW[3] + 26, DOOR, ROW[3] + 26)}${toService(3)}
    ${t(654, 244, "told who signed in:", "tag")}${t(654, 264, "signed headers", "tag")}`))}

  ${on("4", `${zone(24, 362, 712, 60)}
    ${chip(40, 374, 280, 36, "allUsers → Cloud Run Invoker", "warm", "mono")}
    ${line(324, 392, 356, 392, "hot")}
    ${t(368, 382, "refused by an organisation policy:", "tag l")}${t(368, 402, "domain-restricted sharing", "tag l")}`)}
`);

export default widget({ key: "ag7ca", label: "Who may call the agent", css: CSS("ag7ca"), steps, scene });

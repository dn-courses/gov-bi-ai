// ag7-runs-as — where the deployed agent runs and as whom: the request path of the instructor's
// service agent-preview (a notebook → Cloud Run in me-west1 → the model and BigQuery's shop_mart), the
// runtime account that holds the rights, and the two accounts that stand outside the path. Service,
// region, runtime account and dataset were read from GCP on 2026-11-23 (agent-preview runs as
// agent-preview@enjoytech-bq-lab, SHOP_DATASET=enjoytech-bq-lab.shop_mart); the picture has no
// measured numbers in it.
import { CSS, arrow, chip, from, line, lit, node, on, svg, t, widget, zone } from "./ag7-lib.js";

const steps = () => [
  { stop: "Request", title: "One request, four parts",
    note: `A notebook sends one question to <code>agent-preview</code>, in <code>me-west1</code>. The service runs the agent; the agent calls the model and queries the warehouse; the answer comes back the same way.` },
  { stop: "As whom", title: "The agent runs as its own account", decisive: true,
    note: `Cloud Run starts the container as the <b>runtime account</b> named at deploy, here <code>agent-preview@enjoytech-bq-lab</code>. That account alone may call the model (<i>Agent Platform User</i>) and read the data (<i>BigQuery Job User</i> on the project, <i>BigQuery Data Viewer</i> on <code>shop_mart</code>). No key file is in the image: the platform gives the running service its credentials.` },
  { stop: "Outside", title: "Who deployed it is not who it is",
    note: `The instructor's account deployed the service, and a build account turned the source into an image. Neither is on the path of a request. Take the instructor's roles away and the service still runs, with the runtime account's rights and no others.` },
];

const scene = () => svg(760, 430, `
  ${zone(214, 40, 290, 262, "CLOUD RUN · me-west1, TEL AVIV")}
  ${lit("0", `${chip(24, 86, 168, 44, "a notebook")}${arrow(192, 108, 232, 108, "")}`)}
  ${node(234, 72, 250, 56, "agent-preview", "you", "h")}
  ${t(359, 146, "ADK's web server + the shop agent", "lbl")}
  ${from("1", lit("1", `${chip(244, 184, 230, 42, "runs as: agent-preview@…")}`))}
  ${from("1", t(359, 250, "no key file inside", "lbl"))}

  ${node(554, 50, 182, 62, "")}${t(645, 72, "Gemini model", "h")}${t(645, 94, "Agent Platform", "lbl")}
  ${node(554, 196, 182, 62, "")}${t(645, 218, "BigQuery", "h")}${t(645, 240, "dataset shop_mart", "lbl")}

  ${on("0", lit("0", `${arrow(484, 96, 552, 84, "")}${arrow(484, 116, 552, 222, "")}`))}
  ${from("1", lit("1", `${arrow(474, 198, 552, 92, "")}${arrow(474, 212, 552, 226, "")}
    ${t(645, 132, "Agent Platform User", "tag")}
    ${t(645, 278, "BigQuery Job User (project)", "tag")}${t(645, 296, "Data Viewer on shop_mart", "tag")}`))}

  ${from("2", `${zone(24, 318, 712, 100, "NOT ON THE REQUEST PATH")}
    ${lit("2", `${node(44, 346, 316, 60, "")}${t(202, 366, "the instructor's account", "h")}${t(202, 388, "deployed the service, then stepped away", "lbl")}
      ${node(400, 346, 316, 60, "")}${t(558, 366, "the build account", "h")}${t(558, 388, "turned the source into an image", "lbl")}`)}
    ${line(202, 318, 300, 302, "dash")}${line(558, 318, 430, 302, "dash")}`)}
`);

export default widget({ key: "ag7ra", label: "Where the agent runs, and as whom", css: CSS("ag7ra"), steps, scene });

// ag7-where — where the data and the model are, for the instructor's service agent-preview: the service
// in me-west1 (Tel Aviv), the shop_mart dataset in BigQuery's me-west1 location
// (labs/agents/bigquery/shop-mart.sql), the model called at location "global" (the service's
// GOOGLE_CLOUD_LOCATION, read from GCP on 2026-11-23). Why the model is not in Tel Aviv too: what
// me-west1 serves was read from Google's "Gemini Enterprise Agent Platform locations" page on
// 2026-11-22: no generative Gemini model is marked for me-west1; three embedding models are (Gemini
// Embedding, Embeddings for Text, Embeddings for Multimodal). Re-read 2026-11-23: unchanged;
// gemini-3.5-flash-lite is listed under Global only; the multi-region endpoints are us and eu. The
// page states no rule about what an organisation may allow.
import { CSS, arrow, chip, line, lit, node, on, from, svg, t, widget, zone } from "./ag7-lib.js";

const steps = () => [
  { stop: "Tel Aviv", title: "The service and the data sit in Tel Aviv",
    note: `<code>agent-preview</code> runs on Cloud Run in <code>me-west1</code>, Google's Tel Aviv region, beside the dataset <code>shop_mart</code> in BigQuery's <code>me-west1</code> location. A query from the agent to the data stays in Israel.` },
  { stop: "global", title: "The model answers from “global”", decisive: true,
    note: `The service is deployed with <code>GOOGLE_CLOUD_LOCATION=global</code>. On the global endpoint Google picks the region that processes each request; its documentation says you cannot control or know which one.` },
  { stop: "What travels", title: "What leaves the region, on every turn",
    note: `A request to the model carries the agent's instructions, the person's question, the conversation so far, and every result a tool returned. Whatever rows the agent read in Tel Aviv, the model reads too, wherever it runs.` },
  { stop: "Why", title: "Why not the model in Tel Aviv too?",
    note: `On the locations page (November 2026), <code>me-west1</code> lists no generative Gemini model, only embedding models (Gemini Embedding, and the text and multimodal embeddings). So a service in Tel Aviv still calls Gemini somewhere else, as <code>agent-preview</code> does. Where processing must stay inside one jurisdiction, Google offers multi-region endpoints, but only <code>us</code> and <code>eu</code>.` },
  { stop: "Ask", title: "This is a question for your security and legal people",
    note: `The facts above are the provider's. Whether your data may go to a model processed outside Israel is decided by your organisation, for each kind of data. Bring the picture and these questions to the people who decide.` },
];

const scene = () => svg(760, 440, `
  ${lit("0", `${zone(24, 34, 300, 290, "me-west1 · TEL AVIV")}
    ${node(54, 80, 240, 58, "", "you")}${t(174, 100, "agent-preview", "h")}${t(174, 121, "Cloud Run service", "lbl")}
    ${node(54, 214, 240, 58, "")}${t(174, 234, "shop_mart", "h")}${t(174, 255, "BigQuery dataset, me-west1", "lbl")}
    ${line(174, 138, 174, 214)}`)}

  ${from("1", lit("1", `<circle class="zone" cx="590" cy="180" r="146"/>
    <ellipse class="meridian" cx="590" cy="180" rx="60" ry="146"/><line class="meridian" x1="444" y1="180" x2="736" y2="180"/>
    ${t(590, 62, "global", "h")}
    ${node(500, 150, 180, 58, "")}${t(590, 170, "Gemini model", "h")}${t(590, 191, "gemini-3.5-flash-lite", "mono")}
    ${t(590, 246, "region: chosen per request,", "tag")}${t(590, 264, "not known to you", "tag")}`))}
  ${from("1", lit("1 2", arrow(294, 109, 498, 172, "")))}

  ${on("2", lit("2", `${t(24, 352, "WHAT TRAVELS TO THE MODEL, EVERY TURN", "cap")}
    ${chip(24, 366, 170, 40, "the instructions")}${chip(204, 366, 170, 40, "the question")}
    ${chip(384, 366, 170, 40, "the conversation")}${chip(564, 366, 172, 40, "the tool results")}`))}

  ${on("3", `${t(24, 352, "ME-WEST1 ON THE LOCATIONS PAGE, NOVEMBER 2026", "cap")}
    ${chip(24, 366, 340, 40, "generative Gemini models: none", "warm")}
    ${chip(380, 366, 356, 40, "embedding models: three listed", "ok")}`)}

  ${on("4", lit("4", `${t(24, 352, "QUESTIONS TO BRING", "cap")}
    ${chip(24, 366, 220, 40, "How is this data classified?")}${chip(254, 366, 250, 40, "May it be processed abroad?")}
    ${chip(514, 366, 222, 40, "Who decides, in writing?")}`))}
`);

export default widget({ key: "ag7wh", label: "Where the data and the model are", css: CSS("ag7wh") + `.lw .ag7wh .meridian { fill:none; stroke:var(--line); stroke-width:1; }`, steps, scene });

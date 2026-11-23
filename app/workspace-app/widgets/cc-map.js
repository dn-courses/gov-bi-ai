// cc-map — reading any provider's menu by its shelves instead of its product names.
// The product names are examples, written from knowledge and NOT fetched from the providers' pages
// in this session; check them before the seminar. The widget assumes no provider: the point is that
// the shelves are the same on all of them.
import { CSS, chip, node, on, svg, t, widget, zone } from "./cc-lib.js";

const SHELVES = [
  ["Compute", "a machine to run things on", "EC2", "Compute Engine", "Virtual Machines"],
  ["Object storage", "files, by the gigabyte", "S3", "Cloud Storage", "Blob Storage"],
  ["Managed database", "a relational engine, run for you", "RDS", "Cloud SQL", "Azure SQL"],
  ["Analytics", "SQL over very large data", "Redshift · Athena", "BigQuery", "Synapse · Fabric"],
  ["AI and machine learning", "models, called through an API", "Bedrock", "Vertex AI", "Azure AI Foundry"],
];

const OTHERS = ["networking", "identity and access", "logging and monitoring", "containers", "CI/CD", "messaging and queues", "secrets and keys", "backup"];

const steps = () => [
  { stop: "Shelves", title: "Every provider's menu has the same shelves",
    note: `A provider's list of products is very long. Almost all of them are one of a few things you already know, rented: a machine, a disk, a database, an engine for big queries, and lately a language model.` },
  { stop: "Names", title: "The names differ; the shelf does not", decisive: true,
    note: `Whichever provider you meet, read a product name by asking which shelf it is on. What you learn about one provider's shelf carries over to the others almost unchanged; the names here are examples from three large ones.` },
  { stop: "More", title: "There are many more shelves",
    note: `A provider also rents everything around the data: the network, who may do what, logs, containers, the pipeline that ships code. They matter to whoever runs the platform. For BI work the five on the left are the ones you touch.` },
];

const COLX = [290, 440, 590], COLS = ["AWS", "Google Cloud", "Azure"];
const Y = (r) => 58 + r * 60;

const scene = () => svg(760, 392, `
  ${zone(24, 16, 712, 360, "WHAT YOU RENT")}
  ${SHELVES.map(([name, what], r) => `${node(44, Y(r), 226, 50, "", "hit")}${t(157, Y(r) + 17, name, "h acc")}${t(157, Y(r) + 37, what, "lbl")}`).join("")}
  ${on("0", `${t(520, 170, "a very long list of names", "num")}${t(520, 206, "a handful of shelves", "h acc")}`)}
  ${on("1", `${COLS.map((c, i) => t(COLX[i] + 71, 40, c, "h")).join("")}
    ${SHELVES.map((row, r) => [2, 3, 4].map((k, i) => chip(COLX[i], Y(r) + 6, 142, 38, row[k], "", "")).join("")).join("")}`)}
  ${on("2", `${t(513, 44, "also on the menu", "h")}
    ${OTHERS.map((name, i) => chip(300 + (i % 2) * 216, 70 + Math.floor(i / 2) * 60, 200, 40, name, "", "dim")).join("")}
    ${t(513, 330, "the same idea each time: something you would run yourself, rented", "lbl")}`)}
`);

const css = CSS("cm");

export default widget({ key: "cm", label: "Reading a provider's menu", css, steps, scene });

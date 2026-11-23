// The widgets a page can embed, by name.
//  - Shared with the MyST lessons (materials/widgets/src): listed below, one line each.
//  - Written for this app only (workspace-app/widgets/<name>.js): registered by file name, with no
//    line to add here — so two people adding widgets never edit the same file.
type WidgetModule = { default: { render(args: { el: HTMLElement; model: { get(key: string): unknown } }): (() => void) | void } };

const SHARED: Record<string, () => Promise<WidgetModule>> = {
  "db-anatomy": () => import("@widgets/db-anatomy.js"),
  "query-pipeline": () => import("@widgets/query-pipeline.js"),
  "one-plan": () => import("@widgets/one-plan.js"),
  "loop-scan": () => import("@widgets/loop-scan.js"),
  "plan-pull": () => import("@widgets/plan-pull.js"),
  "startup-cost": () => import("@widgets/startup-cost.js"),
  "limit-pull": () => import("@widgets/limit-pull.js"),
  "group-two-ways": () => import("@widgets/group-two-ways.js"),
  "array-memory": () => import("@widgets/array-memory.js"),
  "hash-table": () => import("@widgets/hash-table.js"),
  trees: () => import("@widgets/trees.js"),
  "heap-file": () => import("@widgets/heap-file.js"),
  hangar: () => import("@widgets/hangar.js"),
  "cpu-or-io": () => import("@widgets/cpu-or-io.js"),
  "index-idea": () => import("@widgets/index-idea.js"),
  "sorted-entries": () => import("@widgets/sorted-entries.js"),
  "index-cost": () => import("@widgets/index-cost.js"),
  "bitmap-scan": () => import("@widgets/bitmap-scan.js"),
  "access-dial": () => import("@widgets/access-dial.js"),
  "index-only-scan": () => import("@widgets/index-only-scan.js"),
  "task-missing-index": () => import("@widgets/task-missing-index.js"),
  "task-ignored-index": () => import("@widgets/task-ignored-index.js"),
  "column-stats": () => import("@widgets/column-stats.js"),
  "stats-freshness": () => import("@widgets/stats-freshness.js"),
  "correlated-columns": () => import("@widgets/correlated-columns.js"),
  "join-algorithms": () => import("@widgets/join-algorithms.js"),
  "nested-loop-scan": () => import("@widgets/nested-loop-scan.js"),
  "nested-loop-index": () => import("@widgets/nested-loop-index.js"),
  "hash-join-memory": () => import("@widgets/hash-join-memory.js"),
  "hash-join-batches": () => import("@widgets/hash-join-batches.js"),
  "hash-join-estimates": () => import("@widgets/hash-join-estimates.js"),
  "skewed-histogram": () => import("@widgets/skewed-histogram.js"),
  "merge-join-no-index": () => import("@widgets/merge-join-no-index.js"),
  "merge-join-one-index": () => import("@widgets/merge-join-one-index.js"),
  "merge-join-two-indexes": () => import("@widgets/merge-join-two-indexes.js"),
  "task-broken-join": () => import("@widgets/task-broken-join.js"),
  "parallel-workers": () => import("@widgets/parallel-workers.js"),
  "task-cpu-aggregate": () => import("@widgets/task-cpu-aggregate.js"),
  "task-useless-index": () => import("@widgets/task-useless-index.js"),
  "partitions": () => import("@widgets/partitions.js"),
  "join-orders": () => import("@widgets/join-orders.js"),
};

const LOCAL = import.meta.glob<WidgetModule>("../widgets/*.js");
const named = (path: string) => path.split("/").at(-1)!.replace(/\.js$/, "");

export const WIDGETS: Record<string, () => Promise<WidgetModule>> = {
  ...SHARED,
  ...Object.fromEntries(Object.entries(LOCAL).map(([path, load]) => [named(path), load])),
};

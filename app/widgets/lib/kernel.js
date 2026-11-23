// kernel — talk to the lab's Jupyter server from a widget, with nothing but fetch and WebSocket.
//
// The lab starts Jupyter beside the MyST site (labs/base/init.sh) and allows the site's origin, so a
// widget on a lesson page may start a kernel and run code in the same environment the lesson's cells
// run in — the lab's Postgres is one `psycopg.connect()` away. None of this goes through MyST.
//
// Three things a widget should know:
//   * REST only manages kernels; running code is a WebSocket on the same server.
//   * Every widget on every page shares ONE kernel: the session is opened under a fixed path, and
//     Jupyter hands back the existing session for a path it already has. So page reloads do not
//     leak kernels, and nothing a widget runs may rely on (or leave behind) kernel state.
//   * The lab may not be there (a static preview, a site on another port). `live()` returns null
//     then, and the widget keeps the captured data it already drew.

const DEFAULTS = {
  url: "http://localhost:8888",
  token: "local-dev",
  path: "lab-widgets",
  kernel: "python3",
  connectMs: 4000,
  runMs: 20000,
};

const within = (promise, ms, what) =>
  Promise.race([
    promise,
    new Promise((_, no) => setTimeout(() => no(new Error(`${what} timed out after ${ms} ms`)), ms)),
  ]);

async function openSocket(o) {
  const res = await within(
    fetch(`${o.url}/api/sessions`, {
      method: "POST",
      headers: { Authorization: `token ${o.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: o.path, name: o.path, type: "console", kernel: { name: o.kernel } }),
    }),
    o.connectMs,
    "Jupyter session",
  );
  if (!res.ok) throw new Error(`Jupyter answered ${res.status}`);
  const session = await res.json();
  const ws = new WebSocket(
    `${o.url.replace(/^http/, "ws")}/api/kernels/${session.kernel.id}/channels?token=${encodeURIComponent(o.token)}`,
  );
  await within(
    new Promise((ok, no) => {
      ws.onopen = ok;
      ws.onerror = () => no(new Error("kernel socket refused"));
    }),
    o.connectMs,
    "kernel socket",
  );
  return ws;
}

// One request = one msg_id; replies are routed back by their parent header, so widgets may run
// concurrently over the single socket.
function client(ws, o) {
  const waiting = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const job = waiting.get(msg.parent_header?.msg_id);
    if (!job) return;
    if (msg.msg_type === "stream" && msg.content.name === "stdout") job.out += msg.content.text;
    if (msg.msg_type === "error") job.err = `${msg.content.ename}: ${msg.content.evalue}`;
    if (msg.msg_type === "status" && msg.content.execution_state === "idle") {
      waiting.delete(msg.parent_header.msg_id);
      job.err ? job.no(new Error(job.err)) : job.ok(job.out);
    }
  };

  // Run Python in the kernel; resolves with what it printed.
  const run = (code) => {
    const id = crypto.randomUUID();
    const done = new Promise((ok, no) => waiting.set(id, { ok, no, out: "", err: null }));
    ws.send(
      JSON.stringify({
        header: { msg_id: id, username: "lab-widget", session: o.path, msg_type: "execute_request", version: "5.3", date: new Date().toISOString() },
        parent_header: {},
        metadata: {},
        channel: "shell",
        content: { code, silent: false, store_history: false, user_expressions: {}, allow_stdin: false, stop_on_error: true },
      }),
    );
    return within(done, o.runMs, "kernel run").finally(() => waiting.delete(id));
  };

  // Run SQL statements on ONE connection, in order; resolves with one entry per statement — its
  // rows (arrays), or null for a statement that returns none. `rollback` undoes everything the
  // batch did (build an index, read it, leave no trace); `autocommit` is what VACUUM requires.
  // The connection comes from the lab's PG* environment, exactly as a lesson cell's does; `dbname`
  // names another database on the same server (the lab's `shop`) and leaves the rest to PG*.
  const sql = async (statements, { autocommit = false, rollback = false, dbname = null } = {}) => {
    const out = await run(`
def _lab_widget_sql():
    import json, psycopg
    results = []
    with psycopg.connect(${dbname ? `dbname=${JSON.stringify(String(dbname))}, ` : ""}autocommit=${autocommit ? "True" : "False"}) as conn:
        for statement in json.loads(${JSON.stringify(JSON.stringify(statements))}):
            cur = conn.execute(statement)
            results.append(cur.fetchall() if cur.description else None)
        if ${rollback ? "True" : "False"}:
            conn.rollback()
    print(json.dumps(results, default=str))
_lab_widget_sql()
`);
    return JSON.parse(out);
  };

  return { run, sql };
}

// Each widget is its own bundle with its own copy of this module, so the shared connection lives
// on globalThis, keyed by server and session path.
export function labKernel(options = {}) {
  const o = { ...DEFAULTS, ...options };
  const key = `${o.url}|${o.path}`;
  const open = (globalThis.__labKernels ??= new Map());
  if (!open.has(key)) {
    const pending = openSocket(o).then((ws) => {
      ws.onclose = () => open.delete(key);
      return client(ws, o);
    });
    pending.catch(() => open.delete(key));
    open.set(key, pending);
  }
  return open.get(key);
}

// Load live data, or null when the lab cannot be reached or the load fails. Never throws: a widget
// calls this after it has drawn its captured data, and simply keeps that drawing on null.
export async function live(load, options) {
  try {
    return await load(await labKernel(options));
  } catch (e) {
    console.info(`lab widget: keeping captured data — ${e.message}`);
    return null;
  }
}

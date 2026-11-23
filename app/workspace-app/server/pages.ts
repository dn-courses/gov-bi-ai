// The built pages, kept in step with their sources.
//
// The image carries the pages already built. A course mounts its page sources over the image's
// (compose.app.yml), so a `git pull` can bring pages the image has not seen. When the container
// starts, this compares the two and rebuilds once if they differ — nothing watches while it runs:
// an update is a pull and a restart, and what is being served is always one known build.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const APP = fileURLToPath(new URL("..", import.meta.url));
// Everything a page is made of. The server, the packages and the build setup come with the image.
export const SOURCES = ["content", "src", "widgets", "public", "index.html", "../widgets/src", "../widgets/lib"];
const BUILD = join(APP, "build");
const STAMP = join(BUILD, ".sources");
const NEXT = "/tmp/pages-next";

const log = (message: string) => console.log(`[pages] ${message}`);

// Dotfiles are left out: a .DS_Store the host drops into a mounted folder is not a page change.
function files(path: string): string[] {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  const names = readdirSync(path).filter((name) => !name.startsWith(".")).sort();
  return names.flatMap((name) => files(join(path, name)));
}

// One short id for the content of every source file: equal ids, equal pages.
export function digest(root = APP, sources = SOURCES): string {
  const hash = createHash("sha256");
  for (const file of sources.flatMap((source) => files(join(root, source))))
    hash.update(relative(root, file)).update("\0").update(readFileSync(file)).update("\0");
  return hash.digest("hex").slice(0, 12);
}

function build(): { ok: boolean; output: string } {
  rmSync(NEXT, { recursive: true, force: true });
  const args = ["exec", "vite", "build", "--outDir", NEXT, "--emptyOutDir"];
  const run = spawnSync("pnpm", args, { cwd: APP, encoding: "utf8" });
  return { ok: run.status === 0, output: `${run.stdout ?? ""}${run.stderr ?? ""}${run.error ?? ""}` };
}

// Copied into place, not renamed: the image's build/ sits in a lower layer of the container's
// filesystem, where renaming a directory fails.
function install(id: string) {
  rmSync(BUILD, { recursive: true, force: true });
  cpSync(NEXT, BUILD, { recursive: true });
  writeFileSync(STAMP, id);
  rmSync(NEXT, { recursive: true, force: true });
}

// True when build/ holds pages that can be served, current or not.
export function ensurePages(): boolean {
  const sources = digest();
  const built = existsSync(STAMP) ? readFileSync(STAMP, "utf8").trim() : null;
  if (built === sources) return log(`up to date (build ${built})`), true;
  log(`sources are ${sources}, built pages are ${built ?? "missing"}: building`);
  const started = Date.now();
  const { ok, output } = build();
  if (ok) {
    install(sources);
    return log(`built ${sources} in ${((Date.now() - started) / 1000).toFixed(1)}s`), true;
  }
  log(`BUILD FAILED after ${((Date.now() - started) / 1000).toFixed(1)}s. Vite said:\n${output.trim()}`);
  if (built) log(`still serving build ${built}; fix the page named above and restart`);
  return built !== null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(ensurePages() ? 0 : 1);

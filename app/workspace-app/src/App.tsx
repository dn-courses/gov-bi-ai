import { MDXProvider } from "@mdx-js/react";
import { useEffect, useMemo, useState } from "react";
import { Fence } from "./Cell";
import { Measure } from "./Measure";
import { Arrow, Chevron, Panel, PlayAll, Reset } from "./icons";
import { COURSE, type Entry, LESSONS, type Lesson, MODULES, lessonsIn, partEntries, partTitle } from "./lessons";
import { PageContext, type PageSession } from "./session";
import { Scene, Step } from "./Scene";
import { Widget } from "./Widget";

const COMPONENTS = { pre: Fence, Widget, Scene, Step, Measure };

const slugNow = () => decodeURIComponent(location.hash.replace(/^#\/?/, ""));
const stored = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* a private window: the choice simply does not persist */
  }
};

function useRoute(): Lesson {
  const [slug, setSlug] = useState(slugNow);
  useEffect(() => {
    const onHash = () => (setSlug(slugNow()), window.scrollTo(0, 0));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return LESSONS.find((l) => l.slug === slug) ?? LESSONS.find((l) => l.part === MODULES[0]) ?? LESSONS[0];
}

const COURSE_TITLE = COURSE.title ?? "Relational Database Performance with AI";
const SCALES = [0.85, 1, 1.15, 1.3];

function useScale(): [number, (step: number) => void] {
  const [at, setAt] = useState(() => Math.max(0, SCALES.indexOf(Number(stored("scale", "1")))));
  useEffect(() => {
    document.documentElement.style.setProperty("--scale", String(SCALES[at]));
    store("scale", String(SCALES[at]));
  }, [at]);
  return [at, (step) => setAt((i) => Math.min(SCALES.length - 1, Math.max(0, i + step)))];
}

// How far down the page the reader is, as a thin bar under the top bar.
function useProgress(key: string) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const measure = () => {
      const room = document.documentElement.scrollHeight - innerHeight;
      setDone(room > 0 ? Math.min(1, scrollY / room) : 0);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    return () => window.removeEventListener("scroll", measure);
  }, [key]);
  return done;
}

// Which groups the reader has folded, remembered between visits. Groups start unfolded.
function useFolded(): [Set<string>, (key: string) => void] {
  const [folded, setFolded] = useState(() => new Set<string>(JSON.parse(stored("folded", "[]"))));
  const toggle = (key: string) =>
    setFolded((before) => {
      const after = new Set(before);
      if (!after.delete(key)) after.add(key);
      store("folded", JSON.stringify([...after]));
      return after;
    });
  return [folded, toggle];
}

// Which parts the reader has opened or closed by hand, remembered between visits. A part they have
// not touched is open unless the course folds its parts — and then only the part being read is.
function useParts(current: Lesson): [(module: string) => boolean, (module: string) => void] {
  const [chosen, setChosen] = useState<Record<string, boolean>>(() => JSON.parse(stored("parts", "{}")));
  const isOpen = (module: string) => chosen[module] ?? (!COURSE.folded || module === current.part);
  const toggle = (module: string) =>
    setChosen((before) => {
      const after = { ...before, [module]: !isOpen(module) };
      store("parts", JSON.stringify(after));
      return after;
    });
  return [isOpen, toggle];
}

function LessonLink({ lesson, number, current }: { lesson: Lesson; number: number; current: Lesson }) {
  return (
    <a href={`#/${lesson.slug}`} aria-current={lesson === current ? "page" : undefined}>
      <span className="num">{String(number).padStart(2, "0")}</span>
      <span className="name">{lesson.meta.title}</span>
      {lesson.meta.minutes && <span className="min">{lesson.meta.minutes}m</span>}
    </a>
  );
}

function PartEntry({ entry, id, current, folded, toggle }: { entry: Entry; id: string; current: Lesson; folded: Set<string>; toggle: (key: string) => void }) {
  if ("lesson" in entry) return <LessonLink {...entry} current={current} />;
  const key = `${id}/${entry.group.title}`;
  const open = !folded.has(key);
  const inside = lessonsIn(entry);
  const holdsCurrent = inside.includes(current);
  return (
    <div className="group" data-open={open || undefined} data-current={(!open && holdsCurrent) || undefined}>
      <button type="button" className="fold" onClick={() => toggle(key)} aria-expanded={open}>
        <Chevron />
        <span className="name">{entry.group.title}</span>
        <span className="min">{inside.length}</span>
      </button>
      {open && entry.items.map((item, i) => <PartEntry key={i} entry={item} id={key} current={current} folded={folded} toggle={toggle} />)}
    </div>
  );
}

function Sidebar({ current }: { current: Lesson }) {
  const modules = MODULES;
  const [folded, toggle] = useFolded();
  const [isOpen, togglePart] = useParts(current);
  return (
    <nav className="side">
      <div className="brand">
        <span className="mark" />
        <span>{COURSE_TITLE}</span>
      </div>
      {modules.map((module) => {
        const open = isOpen(module);
        return (
          <section key={module} data-open={open || undefined} data-current={(!open && module === current.part) || undefined}>
            <h2>
              <button type="button" className="part" onClick={() => togglePart(module)} aria-expanded={open}>
                <Chevron />
                <span className="name">{partTitle(module)}</span>
              </button>
            </h2>
            {open &&
              partEntries(module).map((entry, i) => (
                <PartEntry key={i} entry={entry} id={module} current={current} folded={folded} toggle={toggle} />
              ))}
          </section>
        );
      })}
      <p className="keys">
        <kbd>Shift</kbd>
        <kbd>Enter</kbd> run a cell
      </p>
    </nav>
  );
}

// The lab running beside the app, asked once. null until the server answers (or if it cannot).
function useRunningLab(): string | null {
  const [lab, setLab] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((status) => setLab(status.lab ?? ""))
      .catch(() => setLab(null));
  }, []);
  return lab;
}

// Shown when the page's cells need a lab other than the one that is running: the cells would fail
// one by one with connection errors that never name the cause.
function LabNotice({ lesson }: { lesson: Lesson }) {
  const running = useRunningLab();
  const needed = COURSE.labs?.[lesson.slug];
  if (!needed || running === null || running === needed) return null;
  return (
    <p className="lab-notice">
      This page runs on the <b>{needed}</b> lab{running ? <>, and the <b>{running}</b> lab is the one running</> : null}.
      Start it from the course folder with <code>just present {needed}</code>, then reload.
    </p>
  );
}

function Hero({ lesson }: { lesson: Lesson }) {
  const siblings = LESSONS.filter((l) => l.part === lesson.part);
  const { database, settings = {}, minutes } = lesson.meta;
  return (
    <header className="hero">
      <p className="eyebrow">
        {partTitle(lesson.part)}
        <i />
        Lesson {siblings.indexOf(lesson) + 1} of {siblings.length}
      </p>
      <h1>{lesson.meta.title}</h1>
      <p className="chips">
        {minutes && <span>{minutes} min</span>}
        {database && (
          <span>
            <b>database</b> {database}
          </span>
        )}
        {Object.entries(settings).map(([name, value]) => (
          <span key={name}>
            <b>{name}</b> {value}
          </span>
        ))}
      </p>
    </header>
  );
}

export function App() {
  const lesson = useRoute();
  const [scale, zoom] = useScale();
  const [nav, setNav] = useState(() => stored("nav", "open") === "open");
  const [running, setRunning] = useState(false);
  const page = useMemo<PageSession>(() => ({ slug: lesson.slug, meta: lesson.meta, cells: new Set() }), [lesson]);
  const done = useProgress(lesson.slug);
  const at = LESSONS.indexOf(lesson);
  const prev = LESSONS[at - 1];
  const next = LESSONS[at + 1];

  const runAll = async () => {
    setRunning(true);
    const inPageOrder = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    for (const cell of [...page.cells].sort((a, b) => inPageOrder(a.el(), b.el()))) await cell.run();
    setRunning(false);
  };
  const reset = () => fetch("/api/reset", { method: "POST" });

  useEffect(() => {
    document.title = lesson.meta.title;
  });

  return (
    <div className="app" data-nav={nav ? "open" : "closed"}>
      <Sidebar current={lesson} />
      <div className="stage">
        <header className="top">
          <button type="button" className="icon" onClick={() => (store("nav", nav ? "closed" : "open"), setNav(!nav))} title="Contents">
            <Panel />
          </button>
          <span className="crumb">{lesson.meta.title}</span>
          <span className="grow" />
          <div className="zoom" title="Text size">
            <button type="button" className="icon" onClick={() => zoom(-1)} disabled={scale === 0}>
              A<small>−</small>
            </button>
            <button type="button" className="icon" onClick={() => zoom(1)} disabled={scale === SCALES.length - 1}>
              A<small>+</small>
            </button>
          </div>
          <button type="button" className="icon" onClick={reset} title="Reset: forget Python variables and SQL session settings">
            <Reset />
          </button>
          <button type="button" className="primary" onClick={runAll} disabled={running}>
            <PlayAll />
            {running ? "Running" : "Run all"}
          </button>
          <span className="progress" style={{ transform: `scaleX(${done})` }} />
        </header>
        <main key={lesson.slug}>
          <article>
            <Hero lesson={lesson} />
            <LabNotice lesson={lesson} />
            <PageContext.Provider value={page}>
              <MDXProvider components={COMPONENTS}>
                <lesson.Page components={COMPONENTS} />
              </MDXProvider>
            </PageContext.Provider>
            <footer className="pager">
              {prev ? (
                <a href={`#/${prev.slug}`}>
                  <Arrow back />
                  <span>
                    <small>Previous</small>
                    {prev.meta.title}
                  </span>
                </a>
              ) : (
                <span />
              )}
              {next ? (
                <a href={`#/${next.slug}`} className="next">
                  <span>
                    <small>Next</small>
                    {next.meta.title}
                  </span>
                  <Arrow />
                </a>
              ) : (
                <span />
              )}
            </footer>
          </article>
        </main>
      </div>
    </div>
  );
}

// Every lesson page in content/, in reading order. A lesson is an MDX file exporting `meta`.
import type { ComponentType } from "react";

export type LessonMeta = {
  title: string;
  minutes?: number;
  database?: string; // where the page's SQL cells run
  settings?: Record<string, string>; // session settings every SQL cell on the page runs under
};

// What the build says about the course being presented (content/course.json, written from the
// course's `app:` setting): the sidebar's title, what a part is called ("Part" unless the course
// says otherwise), and whether parts start folded. Absent when the app runs on the source tree.
// `labs` names the lab a page's cells need (`<module>/<lesson>` -> lab), for the pages that need one.
// `parts` is the course's own order of its modules, which the sidebar follows. `sections` are the
// course's sections that hold several modules: each is one part. Its `groups` are what the section
// holds, in order: a nested section (titled, with its modules) or one module (titled by its manifest).
export type Section = { title: string; modules: string[]; groups?: { title?: string; modules: string[] }[] };
export type CourseConfig = { title?: string; part?: string; folded?: boolean; parts?: string[]; sections?: Section[]; labs?: Record<string, string> };
const configs = import.meta.glob<CourseConfig>("../content/course.json", { eager: true, import: "default" });
export const COURSE: CourseConfig = Object.values(configs)[0] ?? {};

// A part's own manifest, content/<module-id>/part.json: its title, and optionally groups — named
// runs of its lessons that the sidebar can fold. Lessons keep their number within the part whether
// grouped or not; a lesson no group names is listed on its own.
// A group may hold groups of its own (`groups`), each naming some of its lessons.
export type Group = { title: string; lessons: string[]; groups?: Group[] };
// `order` places the part in the sidebar: lower first, 0 when absent, then by module id.
export type Part = { title?: string; order?: number; groups?: Group[] };

const manifests = import.meta.glob<Part>("../content/*/part.json", { eager: true, import: "default" });
export const PARTS: Record<string, Part> = Object.fromEntries(
  Object.entries(manifests).map(([path, part]) => [path.split("/").at(-2)!, part]),
);

// Where a module sits in the course: the course's order when the build gave one (course.json
// `parts`), otherwise the part's own `order`, then its id.
const place = (module: string) => {
  const at = COURSE.parts?.indexOf(module) ?? -1;
  return at < 0 ? (COURSE.parts?.length ?? 0) + (PARTS[module]?.order ?? 0) : at;
};

// A lesson's part: the course section that holds its module with others, or the module itself.
const section = (module: string) => COURSE.sections?.findIndex((s) => s.modules.includes(module)) ?? -1;
const partOf = (module: string) => (section(module) < 0 ? module : `section:${section(module)}`);

// `module` is the content folder, `part` the sidebar part the lesson is listed under.
export type Lesson = { slug: string; module: string; part: string; name: string; meta: LessonMeta; Page: ComponentType<{ components?: object }> };

const files = import.meta.glob<{ default: Lesson["Page"]; meta: LessonMeta }>("../content/**/*.mdx", { eager: true });

export const LESSONS: Lesson[] = Object.entries(files)
  .map(([path, file]) => {
    const [module, name] = path.replace("../content/", "").replace(".mdx", "").split("/");
    return { slug: `${module}/${name}`, module, part: partOf(module), name, meta: file.meta, Page: file.default };
  })
  .sort((a, b) => place(a.module) - place(b.module) || a.slug.localeCompare(b.slug));

// The parts this build holds, in sidebar order.
export const MODULES: string[] = [...new Set(LESSONS.map((l) => l.part))];

const sectionOf = (part: string) => (part.startsWith("section:") ? COURSE.sections?.[Number(part.slice(8))] : undefined);

// "Part 2 · Tuning": what the course calls a part, its place in the sidebar, and its own title.
export const partTitle = (part: string) =>
  `${COURSE.part ?? "Part"} ${MODULES.indexOf(part) + 1} · ${sectionOf(part)?.title ?? PARTS[part]?.title ?? part}`;

// A part's sidebar entries in lesson order: a lesson, or a group holding consecutive entries —
// lessons, and the group's own groups.
export type Item = { lesson: Lesson; number: number };
export type Entry = Item | { group: Group; items: Entry[] };
export const lessonsIn = (entry: Entry): Lesson[] => ("lesson" in entry ? [entry.lesson] : entry.items.flatMap(lessonsIn));

const lessonsOf = (modules: string[]) => LESSONS.filter((l) => modules.includes(l.module)).map((l) => l.slug);

// A module placed in a section on its own is one group under its name, holding its manifest's
// groups as groups of its own.
const moduleGroup = (module: string): Group => ({
  title: PARTS[module]?.title ?? module,
  lessons: lessonsOf([module]),
  groups: (PARTS[module]?.groups ?? []).map((g) => ({ title: g.title, lessons: g.lessons.map((name) => `${module}/${name}`) })),
});

// A section's groups are what it holds: nested sections and modules; a module's are its manifest's.
const groupsOf = (part: string): Group[] => {
  const held = sectionOf(part);
  if (!held) return (PARTS[part]?.groups ?? []).map((g) => ({ ...g, lessons: g.lessons.map((name) => `${part}/${name}`) }));
  const groups: NonNullable<Section["groups"]> = held.groups ?? held.modules.map((module) => ({ modules: [module] }));
  return groups.map((g) => (g.title ? { title: g.title, lessons: lessonsOf(g.modules) } : moduleGroup(g.modules[0])));
};

// Lay numbered lessons out under the groups that name them, level by level.
function entriesOf(items: Item[], groups: Group[]): Entry[] {
  const entries: Entry[] = [];
  const held = new Map<Group, Item[]>();
  for (const item of items) {
    const group = groups.find((g) => g.lessons.includes(item.lesson.slug));
    if (!group) entries.push(item);
    else if (held.has(group)) held.get(group)!.push(item);
    else { held.set(group, [item]); entries.push({ group, items: [] }); }
  }
  for (const entry of entries) if ("group" in entry) entry.items = entriesOf(held.get(entry.group)!, entry.group.groups ?? []);
  return entries;
}

export const partEntries = (part: string): Entry[] =>
  entriesOf(LESSONS.filter((l) => l.part === part).map((lesson, i) => ({ lesson, number: i + 1 })), groupsOf(part));

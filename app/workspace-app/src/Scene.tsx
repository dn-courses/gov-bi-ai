// A scene: one widget and, for each of its steps, the cells (and any extra text) that belong to
// that step. The page drives the widget. Above the picture: the step's title and the widget's own
// sentence for it (which may carry live numbers), then the page's text. Below it: the step's cells. Every step stays
// mounted, so a cell keeps its output and its edits when the reader steps away and back.
//
//   <Scene widget="pages">
//     <Step> …prose and fenced cells for step 1… </Step>
//     <Step> …for step 2… </Step>
//   </Scene>
import { Children, type ReactElement, type ReactNode, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { Fence } from "./Cell";
import { type StepInfo, Widget, type WidgetHost } from "./Widget";

export function Step({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

// A step's content in two parts: what is said (everything before its first cell) goes above the
// picture, and its cells — with any text between them — go below it.
function split(step: ReactNode): [ReactNode[], ReactNode[]] {
  const inner = isValidElement(step) ? Children.toArray((step as ReactElement<{ children?: ReactNode }>).props.children) : [];
  const first = inner.findIndex((child) => isValidElement(child) && child.type === Fence);
  return first < 0 ? [inner, []] : [inner.slice(0, first), inner.slice(first)];
}

// With several scenes on a page, the arrow keys step one: the scene nearest the middle of the window.
function nearest(): Element | undefined {
  const middle = window.innerHeight / 2;
  const away = (scene: Element) => {
    const box = scene.getBoundingClientRect();
    return box.top <= middle && box.bottom >= middle ? 0 : Math.min(Math.abs(box.top - middle), Math.abs(box.bottom - middle));
  };
  return [...document.querySelectorAll("section.scene")].sort((a, b) => away(a) - away(b))[0];
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest(".cm-editor, input, textarea, select"));

export function Scene({ widget, children }: { widget: string; children?: ReactNode }) {
  const [at, setAt] = useState(0);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const show = useRef<(step: number) => void>(() => {});
  const section = useRef<HTMLElement>(null);
  const host = useMemo<WidgetHost>(
    () => ({
      ready: (control) => {
        show.current = control.show;
        setSteps(control.steps());
      },
      at: (step, all) => {
        setAt(step);
        setSteps(all);
      },
    }),
    [],
  );
  const parts = Children.toArray(children).map(split);
  const last = Math.max(steps.length, parts.length) - 1;
  const go = (step: number) => show.current(Math.min(Math.max(step, 0), last));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (nearest() !== section.current) return;
      if (e.key === "ArrowRight") go(at + 1);
      else if (e.key === "ArrowLeft") go(at - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="scene" ref={section}>
      <ol className="scene-rail">
        {steps.map((step, i) => (
          <li key={i} data-state={i === at ? "on" : i < at ? "done" : undefined} data-decisive={step.decisive || undefined}>
            <button type="button" onClick={() => go(i)}>
              <span className="dot">{i + 1}</span>
              <span>{step.stop}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="scene-head">
        <h3 dangerouslySetInnerHTML={{ __html: steps[at]?.title ?? "" }} />
        <span className="grow" />
        <span className="count">
          {at + 1} / {last + 1}
        </span>
        <button type="button" className="nav" onClick={() => go(at - 1)} disabled={at === 0}>
          ← Back
        </button>
        <button type="button" className="nav next" onClick={() => go(at + 1)} disabled={at === last}>
          Next →
        </button>
      </div>
      <p className="scene-note" dangerouslySetInnerHTML={{ __html: steps[at]?.note ?? "" }} />
      {steps[at]?.produces && (
        <p className="scene-produces">
          produces → <b dangerouslySetInnerHTML={{ __html: steps[at].produces ?? "" }} />
        </p>
      )}
      {parts.map(([said], i) => (
        <div key={i} className="step said" hidden={i !== at}>
          {said}
        </div>
      ))}
      <div className="scene-visual">
        <Widget name={widget} host={host} className="scene-widget" />
      </div>
      {parts.map(([, cells], i) => (
        <div key={i} className="step cells" hidden={i !== at}>
          {cells}
        </div>
      ))}
    </section>
  );
}

import { useEffect, useRef } from "react";
import { WIDGETS } from "./widgets";

// What a page gets when it hosts a widget (see widgets/lib/stepper.js): a way to drive its steps,
// and a report of every step change.
export type StepInfo = { stop: string; title: string; note?: string; produces?: string; decisive?: boolean };
export type WidgetHost = {
  ready?: (control: { show: (step: number) => void; steps: () => StepInfo[] }) => void;
  at?: (step: number, steps: StepInfo[]) => void;
};

// Mount a lesson widget by name; `start` is the step it opens on. With a `host`, the widget draws
// only its scene and the host drives it.
export function Widget({ name, start = 0, host, className = "widget" }: { name: string; start?: number; host?: WidgetHost; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cleanup: (() => void) | void;
    let gone = false;
    const el = document.createElement("div");
    frame.current?.replaceChildren(el);
    const props: Record<string, unknown> = { start, host };
    WIDGETS[name]().then((mod) => {
      if (!gone) cleanup = mod.default.render({ el, model: { get: (key) => props[key] } });
    });
    return () => {
      gone = true;
      cleanup?.();
    };
  }, [name, start, host]);
  return <div className={className} ref={frame} />;
}

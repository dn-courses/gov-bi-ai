// CodeMirror colours for cells, in the app's palette. Backgrounds stay transparent: the cell owns them.
import { tags as t } from "@lezer/highlight";
import { createTheme } from "@uiw/codemirror-themes";

const c = { ink: "#e6ebf3", mute: "#6f7c8f", key: "#c4a7ff", str: "#8fd6a5", num: "#ffb86b", fn: "#7cc0ff", sel: "#2b3b57", caret: "#9ec5ff" };

export const EDITOR_THEME = createTheme({
  theme: "dark",
  settings: { background: "transparent", foreground: c.ink, caret: c.caret, selection: c.sel, selectionMatch: c.sel, lineHighlight: "transparent", gutterBackground: "transparent", gutterForeground: c.mute, gutterBorder: "transparent" },
  styles: [
    { tag: [t.comment, t.lineComment, t.blockComment], color: c.mute, fontStyle: "italic" },
    { tag: [t.keyword, t.operatorKeyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: c.key, fontWeight: "500" },
    { tag: [t.string, t.special(t.string)], color: c.str },
    { tag: [t.number, t.bool, t.null], color: c.num },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.standard(t.name), t.typeName], color: c.fn },
    { tag: [t.operator, t.punctuation], color: c.mute },
  ],
});

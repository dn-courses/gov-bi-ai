import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { cellNumbers } from "./cell-numbers";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [{ enforce: "pre", ...mdx({ providerImportSource: "@mdx-js/react", remarkPlugins: [cellNumbers] }) }, react()],
  resolve: {
    alias: [
      // Widgets ask the lab for live data through ../lib/kernel.js; here the lab is this app's server.
      { find: /^\.\.\/lib\/kernel\.js$/, replacement: at("./src/lab.ts") },
      { find: "@widgets", replacement: at("../widgets/src") },
      { find: "@widget-lib", replacement: at("../widgets/lib") },
    ],
  },
  build: { outDir: "build", chunkSizeWarningLimit: 1200 },
  server: { fs: { allow: [".."] }, proxy: { "/api": "http://localhost:3001" } },
});

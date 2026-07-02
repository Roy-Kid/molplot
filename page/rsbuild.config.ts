import path from "node:path";
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

// The demo bundles @molcrafts/molplot from source (not dist) so edits to the
// core hot-reload here, mirroring the molvis page/ setup.
export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { index: "./src/index.tsx" },
    alias: {
      "@molcrafts/molplot": path.resolve(
        import.meta.dirname,
        "../core/src/index.ts",
      ),
    },
  },
  dev: {
    watchFiles: [{ paths: [path.resolve(import.meta.dirname, "../core/src")] }],
  },
  server: { port: 3000 },
  html: { title: "MolPlot Gallery" },
});

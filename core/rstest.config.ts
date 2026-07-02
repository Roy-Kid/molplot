import { defineConfig } from "@rstest/core";

// The chart engine is now a set of pure Vega-Lite spec builders (specs.ts) —
// the portable intermediate language — so the bulk of coverage runs in Node
// with no browser. Chart-class lifecycle tests inject a fake vega-embed via
// __setVegaEmbedForTesting and assert on the spec that would have been drawn.
export default defineConfig({
  include: ["**/?(*.){test,spec}.?(c|m)[jt]s?(x)"],
});

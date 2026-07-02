import { defineConfig } from "@rslib/core";

export default defineConfig({
  lib: [
    {
      format: "esm",
      bundle: false,
      dts: true,
      source: {
        entry: { index: "./src/**" },
      },
      output: {
        target: "web",
        // The Vega runtime is loaded lazily (vega_loader.ts) and stays out of
        // the bundle so a consumer that never renders a chart never pays for it.
        externals: ["vega", "vega-lite", "vega-embed"],
      },
    },
  ],
});

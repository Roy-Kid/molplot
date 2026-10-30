import path from "node:path";
import { defineConfig } from "@rstest/core";

const root = import.meta.dirname;

export default defineConfig({
  testEnvironment: "happy-dom",
  tools: {
    swc: {
      jsc: { transform: { react: { runtime: "automatic" } } },
    },
  },
  include: ["tests/**/?(*.){test,spec}.?(c|m)[jt]s?(x)"],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
      "@molcrafts/molplot/semantic": path.resolve(
        root,
        "../core/src/semantic/generated.ts",
      ),
    },
  },
});

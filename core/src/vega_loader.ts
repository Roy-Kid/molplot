/**
 * Lazy single-shot loader for the Vega runtime. `vega-embed` bundles `vega` +
 * `vega-lite` and a default tooltip handler; the dynamic `import()` keeps that
 * ~350 KB (gzipped) out of any downstream bundle that never renders a chart —
 * the reason `@molcrafts/molplot` is a separate package.
 *
 * `__setVegaEmbedForTesting` injects a stub so unit tests can assert on the
 * spec that would have been embedded without loading the real runtime.
 */
import type { EmbedOptions, Result, VisualizationSpec } from "vega-embed";

export type VegaEmbed = (
  el: HTMLElement,
  spec: VisualizationSpec,
  opts?: EmbedOptions,
) => Promise<Result>;

let _impl: Promise<VegaEmbed> | null = null;

export function loadVegaEmbed(): Promise<VegaEmbed> {
  if (!_impl) {
    _impl = import("vega-embed").then((m) => m.default as VegaEmbed);
  }
  return _impl;
}

/** Test-only hook. Pass a fake embed fn to inject; pass null to reset. */
export function __setVegaEmbedForTesting(embed: VegaEmbed | null): void {
  _impl = embed ? Promise.resolve(embed) : null;
}

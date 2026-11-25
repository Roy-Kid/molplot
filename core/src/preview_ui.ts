/**
 * The MolCrafts preview header (`@molcrafts/ui/preview`, React) and its
 * stylesheet, loaded together on first use so registering `<molplot-chart>`
 * stays cheap. The header renders in a shadow root with this stylesheet, so
 * a docs page around a chart keeps its own styles.
 *
 * The stylesheet is imported as text (`?raw`): the `elements` bundle inlines
 * it; a bundler consuming the library build must support raw CSS imports.
 */
import type * as PreviewMount from "@molcrafts/ui/preview";

export interface PreviewUi {
  mount: typeof PreviewMount;
  stylesheet: string;
}

let loading: Promise<PreviewUi> | null = null;

export function loadPreviewUi(): Promise<PreviewUi> {
  loading ??= Promise.all([
    import("@molcrafts/ui/preview"),
    import("@molcrafts/ui/styles.css?raw"),
  ]).then(([mount, css]) => ({ mount, stylesheet: css.default }));
  return loading;
}

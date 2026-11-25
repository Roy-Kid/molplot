import type {
  MountedPreviewHeader,
  MountedPreviewNotice,
  PreviewAction,
  PreviewState,
} from "@molcrafts/ui/preview";
import { showImageExportDialog } from "@molcrafts/ui-web-components/image-export";
import {
  type ChartFacts,
  chartFacts,
  renderDataTable,
} from "./element_preview";
import type { PresetName } from "./preset";
import { loadPreviewUi } from "./preview_ui";
import { RawChart } from "./raw_chart";
import { reportMolplotError } from "./report";
import type { VegaLiteSpec } from "./specs";
import type { ThemeMode } from "./types";

/**
 * The `<molplot-chart>` custom element — a native Web Component wrapper around
 * {@link RawChart} so a Vega-Lite spec can be dropped straight into Markdown (or
 * any HTML) and rendered live in the browser. The unified molplot preset is
 * injected as the spec `config` (unless the spec carries its own), and
 * `<html class="dark">` is tracked, exactly as {@link RawChart} does.
 *
 * The author-facing content **is a plain Vega-Lite spec** — no bespoke schema.
 * It is read from the first child `<script type="application/json">` block, so
 * multiline JSON with `<`/`>`/braces survives Markdown/HTML sanitization:
 *
 * ```html
 * <molplot-chart preset="molplot" theme="auto">
 *   <script type="application/json">
 *   { "mark": "line",
 *     "data": { "values": [ {"x":0,"y":1}, {"x":1,"y":2} ] },
 *     "encoding": { "x": {"field":"x","type":"quantitative"},
 *                   "y": {"field":"y","type":"quantitative"} } }
 *   </script>
 * </molplot-chart>
 * ```
 *
 * Attributes: `preset` (unified preset name, default the molplot preset),
 * `theme` (`auto` | `light` | `dark`, default `auto`), `interactive` (`false`
 * disables the default pan/zoom bindings), `spec` (inline JSON, a one-line
 * alternative to the script block), `label` (what the figure shows, the
 * header title; default the spec's `title`), and `mode` (`readonly` |
 * `edit`; absent is `readonly`). The header is the MolCrafts preview header
 * from `@molcrafts/ui` (React, in a shadow root): reset view, zoom, fullscreen, a data
 * table, and PNG / SVG export. A chart has nothing to undo or clear, so both
 * modes show the same actions.
 */

export { reportMolplotError } from "./report";

/** Outcome of reading the author-embedded Vega-Lite spec. */
export type SpecRead =
  | { spec: VegaLiteSpec; reason?: undefined; cause?: undefined }
  | { spec: null; reason: "empty" | "invalid-json"; cause?: unknown };

/**
 * Read the Vega-Lite spec an author embedded in a `<molplot-chart>`. Prefers
 * the first child `<script type="application/json">`, then a `spec` attribute.
 * Distinguishes empty from malformed JSON so the error boundary can log why.
 */
export function readSpec(el: HTMLElement): SpecRead {
  const script = el.querySelector('script[type="application/json"]');
  const raw = script?.textContent ?? el.getAttribute("spec");
  if (!raw?.trim()) return { spec: null, reason: "empty" };
  try {
    return { spec: JSON.parse(raw) as VegaLiteSpec };
  } catch (cause) {
    return { spec: null, reason: "invalid-json", cause };
  }
}

/**
 * Parse the Vega-Lite spec an author embedded in a `<molplot-chart>`. Returns
 * null when no spec is present or the JSON is malformed — the element renders
 * an inline error rather than throwing, so a typo in one doc block never
 * breaks the page.
 */
export function parseSpec(el: HTMLElement): VegaLiteSpec | null {
  return readSpec(el).spec;
}

/** Coerce a `theme` attribute to a valid mode, defaulting to `auto`. */
function parseTheme(value: string | null): ThemeMode {
  return value === "light" || value === "dark" ? value : "auto";
}

/** Interaction is on by default; accept common false-like HTML values. */
export function parseInteractive(value: string | null): boolean {
  if (value === null || value === "") return true;
  return !["false", "0", "off", "none"].includes(value.toLowerCase());
}

/** Parse `4:3`, `4/3`, or a numeric width:height ratio. */
export function parseAspect(value: string | null): number {
  if (!value) return 4 / 3;
  const parts = value.split(/[:/]/).map(Number);
  const ratio =
    parts.length === 2 && parts[0] && parts[1]
      ? parts[0] / parts[1]
      : Number(value);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 4 / 3;
}

const ELEMENT_STYLE_ID = "molplot-element-defaults";

/**
 * The host's size is the author's (`:where` keeps it overridable). The frame,
 * surface and embed are the element's own layout, so their rules carry real
 * specificity: a page rule such as `molplot-chart { display: block }` or the
 * `.vega-embed { position: relative }` that vega-embed injects must not put
 * the canvas back in flow. In flow, the canvas sizes the surface, the surface
 * is measured, and the chart grows on every resize.
 */
export const ELEMENT_CSS = `
:where([data-molplot-chart]) {
  display: block;
  box-sizing: border-box;
  /* Preview fills the host. A bare embed with no parent height uses min-height. */
  width: var(--molplot-width, 100%);
  height: 100%;
  min-height: 16rem;
  aspect-ratio: var(--molplot-aspect, auto);
  overflow: hidden;
}
[data-molplot-chart] {
  position: relative;
}
[data-molplot-chart] > .molplot-chart__frame {
  position: absolute;
  inset: var(--molplot-pad, 0);
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
[data-molplot-chart] > .molplot-chart__frame > .molplot-chart__header {
  min-height: var(--spacing-toolbar-compact, 2.5rem);
}
[data-molplot-chart] > .molplot-chart__frame > .molplot-chart__surface {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
[data-molplot-chart] .molplot-chart__surface > .molplot-chart__table {
  position: absolute;
  inset: 0;
  overflow: auto;
  background: var(--surface, #fff);
  color: var(--foreground, #242424);
  font: 400 var(--text-label, 12px) / var(--text-label--line-height, 16px) var(--font-sans, system-ui, sans-serif);
}
[data-molplot-chart] .molplot-chart__table[hidden] { display: none; }
[data-molplot-chart] .molplot-chart__surface > .molplot-chart__notice {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
[data-molplot-chart] .molplot-chart__notice[hidden] { display: none; }
[data-molplot-chart] .molplot-chart__table:focus-visible { outline: 2px solid var(--ring, #000); outline-offset: -2px; }
[data-molplot-chart] .molplot-chart__table table { width: 100%; border-collapse: collapse; }
/* The header already names the figure; the caption is for screen readers. */
[data-molplot-chart] .molplot-chart__table caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
[data-molplot-chart] .molplot-chart__table th,
[data-molplot-chart] .molplot-chart__table td {
  padding: 0.375rem 0.75rem;
  border-bottom: 1px solid var(--border, #e0e0e0);
  text-align: left;
  white-space: nowrap;
}
[data-molplot-chart] .molplot-chart__table thead th {
  position: sticky;
  top: 0;
  background: var(--background, #fafafa);
  font-weight: var(--font-weight-semibold, 600);
}
[data-molplot-chart] .molplot-chart__table [data-numeric] { text-align: right; font-variant-numeric: tabular-nums; }
[data-molplot-chart] .molplot-chart__table tbody th { font-weight: var(--font-weight-normal, 400); }
[data-molplot-chart] .molplot-chart__surface > .molplot-chart__embed {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
`;

function installElementStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(ELEMENT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ELEMENT_STYLE_ID;
  style.textContent = ELEMENT_CSS;
  document.head.appendChild(style);
}

/**
 * Register the `<molplot-chart>` custom element. Idempotent and browser-only:
 * a no-op when there is no `customElements` registry (SSR/Node) or the tag is
 * already defined. The element class is created here, on call, so merely
 * importing this module never evaluates `class extends HTMLElement` — the
 * library stays import-side-effect-free and safe to load in Node.
 */
export function defineMolplotChart(tag = "molplot-chart"): void {
  if (
    typeof customElements === "undefined" ||
    typeof HTMLElement === "undefined"
  )
    return;
  if (customElements.get(tag)) return;
  installElementStyles();

  class MolplotChartElement extends HTMLElement {
    static readonly observedAttributes = [
      "spec",
      "preset",
      "theme",
      "interactive",
      "width",
      "aspect",
      "mode",
      "label",
    ];

    connectedCallback(): void {
      this.setAttribute("data-molplot-chart", "");
      // Theme embeds-guard may have stamped a load-failure banner before
      // this element upgraded. Drop it so a working chart is not covered.
      this.removeAttribute("data-molcrafts-embed-error");
      for (const box of Array.from(
        this.querySelectorAll("[data-molcrafts-embed-error-msg]"),
      )) {
        box.remove();
      }
      this.applySizing();
      this.mount();
    }

    disconnectedCallback(): void {
      this.teardown();
    }

    attributeChangedCallback(name: string): void {
      if (name === "width" || name === "aspect") this.applySizing();
      // Attributes are also set before the first connect; only react once live.
      if (this.isConnected && this.chart) {
        this.teardown();
        this.mount();
      }
    }

    private mount(): void {
      if (this.chart) return; // already mounted (guard double-connect)
      const frame = document.createElement("div");
      frame.className = "molplot-chart__frame";
      const header = document.createElement("div");
      header.className = "molplot-chart__header";
      const surface = document.createElement("div");
      surface.className = "molplot-chart__surface";
      const embed = document.createElement("div");
      embed.className = "molplot-chart__embed";
      const table = document.createElement("div");
      table.className = "molplot-chart__table";
      table.hidden = true;
      table.tabIndex = 0;
      const notice = document.createElement("div");
      notice.className = "molplot-chart__notice";
      surface.append(embed, table, notice);
      frame.append(header, surface);
      this.append(frame);
      this.frame = frame;
      this.tableHost = table;
      this.showTable = false;
      this.state = { kind: "loading", message: "Drawing the chart…" };

      const parsed = readSpec(this);
      this.facts = parsed.spec
        ? chartFacts(parsed.spec, this.getAttribute("label") ?? undefined)
        : {};
      void this.mountHeader(header, notice);
      if (!parsed.spec) {
        const message =
          parsed.reason === "empty"
            ? "missing Vega-Lite spec (empty JSON script / spec attribute)"
            : "invalid Vega-Lite JSON";
        this.fail(parsed.cause ?? new Error(message), message);
        return;
      }
      const preset =
        (this.getAttribute("preset") as PresetName | null) ?? undefined;
      const theme = parseTheme(this.getAttribute("theme"));
      const interactive = parseInteractive(this.getAttribute("interactive"));
      const aspectRatio = parseAspect(this.getAttribute("aspect"));
      this.dataset.state = "loading";
      this.chart = new RawChart(embed, {
        spec: parsed.spec,
        preset,
        theme,
        interactive,
        aspectRatio,
      });
      void this.chart.ready().then(
        () => {
          if (!this.chart) return;
          this.dataset.state = "ready";
          this.setState({ kind: "ready" });
          this.dispatchEvent(
            new CustomEvent("molplot:ready", { bubbles: true, composed: true }),
          );
        },
        (cause: unknown) => {
          this.fail(cause, "failed to render");
        },
      );
    }

    private chart: RawChart | null = null;
    private frame: HTMLElement | null = null;
    private tableHost: HTMLElement | null = null;
    private header: MountedPreviewHeader | null = null;
    private exportDialog: HTMLDialogElement | null = null;
    private notice: MountedPreviewNotice | null = null;
    private facts: ChartFacts = {};
    private showTable = false;
    private state: PreviewState = { kind: "loading" };
    private readonly onFullscreen = (): void => this.refreshHeader();

    /** `theme="light"|"dark"` pins the header; `auto` follows `.dark`. */
    private headerTheme(): "light" | "dark" | undefined {
      const theme = parseTheme(this.getAttribute("theme"));
      return theme === "auto" ? undefined : theme;
    }

    private setState(state: PreviewState): void {
      this.state = state;
      // Actions depend on readiness (export needs a drawn chart).
      this.header?.update({ state, actions: this.actions() });
      this.notice?.update(state);
    }

    private fail(cause: unknown, scope: string): void {
      const error = reportMolplotError(scope, cause, this);
      this.dataset.state = "error";
      this.setState({
        kind: "error",
        message: `Could not draw the chart: ${error.message}`,
      });
      this.dispatchEvent(
        new CustomEvent("molplot:error", {
          detail: { error },
          bubbles: true,
          composed: true,
        }),
      );
    }

    /** The header's actions: view (reset, zoom, fullscreen), inspect (data table), export. */
    private actions(): PreviewAction[] {
      const ready = this.state.kind === "ready";
      const actions: PreviewAction[] = [
        {
          kind: "button",
          id: "fit",
          label: "Reset view",
          icon: "reset-view",
          group: "view",
          shortcut: "f",
          disabled: !ready,
          run: () => void this.resetView(),
        },
        {
          kind: "button",
          id: "zoom-in",
          label: "Zoom in",
          icon: "zoom-in",
          group: "view",
          shortcut: "+",
          disabled: !ready || this.showTable,
          run: () => void this.chart?.zoomBy(0.7),
        },
        {
          kind: "button",
          id: "zoom-out",
          label: "Zoom out",
          icon: "zoom-out",
          group: "view",
          shortcut: "-",
          disabled: !ready || this.showTable,
          run: () => void this.chart?.zoomBy(1 / 0.7),
        },
      ];
      if (document.fullscreenEnabled) {
        const full = document.fullscreenElement === this;
        actions.push({
          kind: "toggle",
          id: "fullscreen",
          label: full ? "Exit fullscreen" : "Fullscreen",
          icon: full ? "exit-fullscreen" : "fullscreen",
          group: "view",
          pressed: full,
          onToggle: (next) =>
            void (next ? this.requestFullscreen() : document.exitFullscreen()),
        });
      }
      if (this.facts.table) {
        actions.push({
          kind: "toggle",
          id: "table",
          label: "Data table",
          icon: "table",
          group: "inspect",
          pressed: this.showTable,
          onToggle: (next) => this.toggleTable(next),
        });
      }
      actions.push({
        kind: "button",
        id: "export",
        label: "Export",
        icon: "export",
        group: "export",
        disabled: !ready,
        run: () => void this.openExport(),
      });
      return actions;
    }

    private refreshHeader(): void {
      this.header?.update({ actions: this.actions(), state: this.state });
    }

    /** The MolCrafts preview header. `mode` is explicit; absent is read-only. */
    private async mountHeader(
      host: HTMLElement,
      noticeHost: HTMLElement,
    ): Promise<void> {
      try {
        const { mount, stylesheet } = await loadPreviewUi();
        if (this.frame !== host.parentElement) return;
        const mode = mount.parsePreviewMode(this.getAttribute("mode"));
        this.dataset.mode = mode;
        const options = { stylesheet, theme: this.headerTheme() };
        this.header = mount.mountPreviewHeader(
          host,
          {
            mode,
            product: "MolPlot",
            title: this.facts.title,
            meta: this.facts.meta,
            state: this.state,
            actions: this.actions(),
          },
          options,
        );
        this.notice = mount.mountPreviewNotice(noticeHost, this.state, options);
        document.addEventListener("fullscreenchange", this.onFullscreen);
      } catch (cause) {
        const error = reportMolplotError(
          "failed to mount the header",
          cause,
          this,
        );
        host.textContent = `Could not show the header: ${error.message}`;
      }
    }

    private async resetView(): Promise<void> {
      this.toggleTable(false);
      await this.chart?.resize();
    }

    private toggleTable(show: boolean): void {
      const host = this.tableHost;
      const table = this.facts.table;
      if (!host || !table) return;
      this.showTable = show;
      if (show) renderDataTable(host, table, this.facts.title ?? "Chart data");
      host.hidden = !show;
      this.refreshHeader();
      if (show) host.focus();
    }

    private async openExport(): Promise<void> {
      const { mount } = await loadPreviewUi();
      const chart = this.chart;
      if (!chart || !this.frame || this.exportDialog?.open) return;
      this.exportDialog = showImageExportDialog(this.frame, {
        filename: mount.previewFileName(this.facts.title, "png", "chart"),
        capture: async () => ({
          kind: "svg",
          markup: await chart.exportImage("svg"),
        }),
      });
    }

    private teardown(): void {
      this.exportDialog?.close();
      this.exportDialog = null;
      document.removeEventListener("fullscreenchange", this.onFullscreen);
      this.header?.destroy();
      this.header = null;
      this.notice?.destroy();
      this.notice = null;
      this.chart?.dispose();
      this.chart = null;
      this.frame?.remove();
      this.frame = null;
      this.tableHost = null;
    }

    private applySizing(): void {
      const width = this.getAttribute("width");
      const aspect = this.getAttribute("aspect");
      if (width) this.style.setProperty("--molplot-width", width);
      else this.style.removeProperty("--molplot-width");
      if (aspect) {
        this.style.setProperty("--molplot-aspect", aspect.replace(":", " / "));
      } else {
        this.style.removeProperty("--molplot-aspect");
      }
    }
  }

  customElements.define(tag, MolplotChartElement);
}

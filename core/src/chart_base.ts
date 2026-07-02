import type { VegaLiteSpec } from "./specs";
import { type ChartTheme, resolveTheme } from "./theme";
import type { ThemeMode } from "./types";
import { loadVegaEmbed, type VegaEmbed } from "./vega_loader";

/** Minimal shape of the vega-embed result we depend on. */
interface EmbedResult {
  view: {
    data(name: string, values?: unknown[]): unknown;
    resize(): { run(): unknown };
    run(): unknown;
    addEventListener(
      type: string,
      handler: (e: unknown, item: unknown) => void,
    ): void;
    finalize(): void;
  };
}

/**
 * Shared lifecycle for every chart: lazy vega-embed load, spec→embed render,
 * cheap streaming data updates (`view.data(name, rows)`), rAF-debounced
 * re-embed on resize, `<html class="dark">` theme tracking, and click→datum
 * wiring. Subclasses implement {@link buildSpec} (produce a Vega-Lite spec —
 * the portable intermediate language) and {@link datasets} (current rows per
 * named dataset), and optionally {@link onDatum} (turn a clicked datum into a
 * typed event).
 */
export abstract class VegaChart {
  protected readonly container: HTMLElement;
  protected themeMode: ThemeMode;
  protected presetName: string | undefined;
  protected disposed = false;
  protected embed: VegaEmbed | null = null;
  protected result: EmbedResult | null = null;
  protected readonly mountPromise: Promise<void>;
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private resizeRaf: number | null = null;
  private lastW = 0;
  private lastH = 0;
  private renderInFlight: Promise<void> | null = null;

  constructor(
    container: HTMLElement,
    themeMode: ThemeMode,
    presetName?: string,
  ) {
    this.container = container;
    this.themeMode = themeMode;
    this.presetName = presetName;
    this.mountPromise = this.mount();
    this.setupResizeObserver();
    if (this.themeMode === "auto") this.setupThemeObserver();
  }

  /** Resolves once the initial render completes. */
  ready(): Promise<void> {
    return this.mountPromise;
  }

  async resize(): Promise<void> {
    await this.mountPromise;
    if (this.disposed) return;
    await this.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (
      this.resizeRaf !== null &&
      typeof cancelAnimationFrame !== "undefined"
    ) {
      cancelAnimationFrame(this.resizeRaf);
    }
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    this.resizeObserver = null;
    this.themeObserver = null;
    this.result?.view.finalize();
    this.result = null;
  }

  /** Build the Vega-Lite spec for the current state + theme. */
  protected abstract buildSpec(
    theme: ChartTheme,
    size: { width: number; height: number },
  ): VegaLiteSpec;

  /** Current rows per named dataset referenced by the spec. */
  protected abstract datasets(): Record<string, unknown[]>;

  /** Handle a clicked datum. Default: no-op. */
  protected onDatum(_datum: Record<string, unknown>): void {}

  private async mount(): Promise<void> {
    this.embed = await loadVegaEmbed();
    if (this.disposed) return;
    await this.render();
  }

  /** Full re-embed. Serialised so a theme/resize fire can't interleave. */
  protected async render(): Promise<void> {
    if (this.renderInFlight) await this.renderInFlight;
    const run = this.renderImpl();
    this.renderInFlight = run.finally(() => {
      if (this.renderInFlight === run) this.renderInFlight = null;
    });
    return run;
  }

  private async renderImpl(): Promise<void> {
    if (!this.embed || this.disposed) return;
    const theme = resolveTheme(this.themeMode, this.presetName);
    const { width, height } = this.dims();
    this.lastW = width;
    this.lastH = height;
    const spec = this.buildSpec(theme, { width, height });
    this.result?.view.finalize();
    this.result = null;
    const result = (await this.embed(this.container, spec as never, {
      actions: false,
      renderer: "svg",
      tooltip: true,
    })) as unknown as EmbedResult;
    if (this.disposed) {
      result.view.finalize();
      return;
    }
    this.feed(result);
    result.view.addEventListener("click", (_e, item) => {
      const datum = (item as { datum?: Record<string, unknown> } | undefined)
        ?.datum;
      if (datum) this.onDatum(datum);
    });
    this.result = result;
  }

  /** Push the current datasets into a freshly embedded view. */
  private feed(result: EmbedResult): void {
    const data = this.datasets();
    let changed = false;
    for (const [name, rows] of Object.entries(data)) {
      try {
        result.view.data(name, rows);
        changed = true;
      } catch {
        /* dataset not present in this spec — skip */
      }
    }
    if (changed) result.view.resize().run();
  }

  /** Cheap in-place data swap (streaming path); re-embeds if no live view. */
  protected async setData(name: string, rows: unknown[]): Promise<void> {
    await this.mountPromise;
    if (this.disposed) return;
    if (this.result) {
      try {
        this.result.view.data(name, rows);
        this.result.view.resize().run();
        return;
      } catch {
        /* fall through to a full re-embed */
      }
    }
    await this.render();
  }

  /** Await mount then re-embed — the entry point full mutators call. */
  protected async rerender(): Promise<void> {
    await this.mountPromise;
    if (this.disposed) return;
    await this.render();
  }

  protected dims(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect?.();
    const width = Math.max(1, Math.round(rect?.width || 0) || 640);
    const height = Math.max(1, Math.round(rect?.height || 0) || 320);
    return { width, height };
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeRaf !== null) return;
      this.resizeRaf = requestAnimationFrame(() => {
        this.resizeRaf = null;
        if (this.disposed) return;
        const { width, height } = this.dims();
        if (width === this.lastW && height === this.lastH) return;
        void this.render();
      });
    });
    this.resizeObserver.observe(this.container);
  }

  private setupThemeObserver(): void {
    if (typeof MutationObserver === "undefined") return;
    if (typeof document === "undefined") return;
    this.themeObserver = new MutationObserver(() => {
      if (this.disposed) return;
      void this.render();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
}

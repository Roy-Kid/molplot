import { VegaChart } from "./chart_base";
import type { PresetName } from "./preset";
import {
  interactionParams,
  type VegaLiteSpec,
  VL_SCHEMA,
  type ZoomChannel,
} from "./specs";
import { type ChartTheme, fontScaleForHost, vegaConfig } from "./theme";
import type { ThemeMode } from "./types";

/**
 * Render a plain Vega-Lite top-level spec. Labels/rules are ordinary VL marks
 * in `layer` so they pan/zoom with the chart.
 */
export interface RawChartConfig {
  /** A Vega-Lite top-level spec. */
  spec: VegaLiteSpec;
  preset?: PresetName;
  theme?: ThemeMode;
  /** Scale-bound pan/zoom when the spec has continuous x/y. Default true. */
  interactive?: boolean;
  /** Responsive width:height ratio. Default 4 / 3. */
  aspectRatio?: number;
}

export class RawChart extends VegaChart {
  private spec: VegaLiteSpec = {};
  private interactive = true;
  private aspectRatio = 4 / 3;

  constructor(container: HTMLElement, config: RawChartConfig) {
    super(container, config.theme ?? "auto", config.preset);
    this.applyConfig(config);
  }

  async update(config: RawChartConfig): Promise<void> {
    this.applyConfig(config);
    await this.rerender();
  }

  private applyConfig(config: RawChartConfig): void {
    this.spec = (config.spec ?? {}) as VegaLiteSpec;
    this.interactive = config.interactive ?? true;
    this.aspectRatio = config.aspectRatio ?? 4 / 3;
  }

  protected datasets(): Record<string, unknown[]> {
    return {};
  }

  protected resizeChanged(
    previous: { width: number; height: number },
    next: { width: number; height: number },
  ): boolean {
    if (this.spec?.height === undefined) return previous.width !== next.width;
    return super.resizeChanged(previous, next);
  }

  protected buildSpec(
    theme: ChartTheme,
    sizeHint: { width: number; height: number },
  ): VegaLiteSpec {
    const scale = fontScaleForHost(sizeHint.width, theme.hostFontPx);
    const spec = { ...(this.spec ?? {}) } as VegaLiteSpec;
    const channels = this.interactive ? continuousChannels(spec) : [];
    const derivedHeight = Math.max(
      1,
      Math.round(sizeHint.width / this.aspectRatio),
    );
    const height =
      sizeHint.height > 1
        ? Math.max(1, Math.round(sizeHint.height))
        : derivedHeight;
    const baseConfig = vegaConfig(theme, scale);
    const authorConfig =
      spec.config && typeof spec.config === "object"
        ? (spec.config as Record<string, unknown>)
        : null;
    const config = authorConfig
      ? deepMergeConfig(baseConfig, stripFrozenTypeSizes(authorConfig))
      : baseConfig;

    const {
      width: _authorWidth,
      height: _authorHeight,
      autosize: _authorAutosize,
      ...rest
    } = spec;
    // Host size is applied after the author spec. A numeric height in the
    // spec (the paper default) must not leave a band under the plot.
    const base: VegaLiteSpec = {
      $schema: VL_SCHEMA,
      ...rest,
      width: sizeHint.width,
      height,
      autosize: { type: "fit", contains: "padding" },
      config,
    };

    const explorable = this.interactive
      ? withSeriesToggle(withTooltip(base))
      : base;
    if (channels.length === 0) return explorable;

    const zoom = interactionParams(channels);
    const layers = Array.isArray(spec.layer)
      ? (spec.layer as Record<string, unknown>[])
      : null;

    // Layered specs: zoom params on first unit layer only (avoids duplicate
    // zoomX_* signals when top-level params + multi-layer are combined).
    if (layers && layers.length > 0) {
      const nextLayers = layers.map((layer, i) => {
        if (i !== 0) return layer;
        return {
          ...layer,
          params: mergeZoomParams(layer.params, zoom),
        };
      });
      const { params: _drop, ...rest } = base;
      return { ...rest, layer: nextLayers };
    }

    return {
      ...explorable,
      params: mergeZoomParams(explorable.params, zoom),
    };
  }
}

type ChannelDef = {
  field?: string;
  type?: string;
  title?: unknown;
  axis?: { title?: unknown } | null;
  legend?: { title?: unknown } | null;
};

/** The name a reader sees for a channel: its title, its axis or legend title, then the field. */
export function channelTitle(def: ChannelDef, fallback: string): string {
  for (const title of [def.title, def.axis?.title, def.legend?.title]) {
    if (typeof title === "string" && title.trim() !== "") return title;
  }
  return fallback;
}

/**
 * Hovering a mark shows its encoded values under the titles the reader
 * sees on the axes and legend, unless the author chose a tooltip.
 */
function withTooltip(spec: VegaLiteSpec): VegaLiteSpec {
  const encoding = spec.encoding as
    | Record<string, ChannelDef | undefined>
    | undefined;
  if (!encoding || encoding.tooltip !== undefined || spec.mark === undefined)
    return spec;
  const tooltip = (["x", "y", "color"] as const).flatMap((channel) => {
    const def = encoding[channel];
    if (!def?.field) return [];
    const title = channelTitle(def, channel === "color" ? "series" : def.field);
    return [
      {
        field: def.field,
        type: def.type ?? "nominal",
        title,
        ...(def.type === "quantitative" && { format: ".4~g" }),
      },
    ];
  });
  return tooltip.length === 0
    ? spec
    : { ...spec, encoding: { ...encoding, tooltip } };
}

export const SERIES_PARAM = "series";

/**
 * Clicking a legend entry, or a mark, dims the other series (shift-click
 * adds; clicking empty space clears). View
 * state only: the data and the spec are unchanged, and a re-render clears it.
 */
function withSeriesToggle(spec: VegaLiteSpec): VegaLiteSpec {
  const encoding = spec.encoding as
    | Record<
        string,
        { field?: string; type?: string; legend?: unknown } | undefined
      >
    | undefined;
  const color = encoding?.color;
  if (!color?.field || color.legend === null || encoding?.opacity !== undefined)
    return spec;
  if (color.type !== "nominal" && color.type !== "ordinal") return spec;
  const params = Array.isArray(spec.params)
    ? (spec.params as { name?: string }[])
    : [];
  if (params.some((param) => param.name === SERIES_PARAM)) return spec;
  return {
    ...spec,
    params: [
      ...params,
      {
        name: SERIES_PARAM,
        select: { type: "point", fields: [color.field] },
        bind: "legend",
      },
    ],
    encoding: {
      ...encoding,
      opacity: { condition: { param: SERIES_PARAM, value: 1 }, value: 0.18 },
    },
  };
}

function mergeZoomParams(
  existing: unknown,
  zoom: ReturnType<typeof interactionParams>,
): unknown[] {
  const zoomNames = new Set(zoom.map((p) => p.name));
  const kept: unknown[] = [];
  if (Array.isArray(existing)) {
    for (const p of existing) {
      const name =
        p && typeof p === "object" && "name" in p
          ? String((p as { name: unknown }).name)
          : "";
      if (name && zoomNames.has(name as "zoomX" | "zoomY")) continue;
      kept.push(p);
    }
  }
  return [...kept, ...zoom];
}

const FROZEN_TYPE_KEYS = new Set([
  "titleFontSize",
  "labelFontSize",
  "fontSize",
  "titleLimit",
  "labelLimit",
  "titlePadding",
  "labelPadding",
  "tickSize",
  "symbolSize",
  "offset",
  "rowPadding",
  "columnPadding",
]);

function stripFrozenTypeSizes(
  over: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(over)) {
    if (key === "padding") continue;
    if (FROZEN_TYPE_KEYS.has(key) && typeof value === "number") continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = stripFrozenTypeSizes(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function deepMergeConfig(
  base: Record<string, unknown>,
  over: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const prev = out[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      prev !== null &&
      typeof prev === "object" &&
      !Array.isArray(prev)
    ) {
      out[key] = deepMergeConfig(
        prev as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

function continuousChannels(spec: VegaLiteSpec): ZoomChannel[] {
  const top = spec.encoding as
    | Record<string, { type?: string; field?: string } | undefined>
    | undefined;
  const layers = Array.isArray(spec.layer)
    ? (spec.layer as {
        encoding?: Record<string, { type?: string; field?: string }>;
      }[])
    : [];
  const layerEnc = layers.find((layer) => layer?.encoding)?.encoding;
  return (["x", "y"] as const).filter((channel) => {
    const type = top?.[channel]?.type ?? layerEnc?.[channel]?.type;
    if (type === "quantitative" || type === "temporal") return true;
    // A band axis (bar categories) cannot take a scale binding.
    if (type === "nominal" || type === "ordinal") return false;
    const field = top?.[channel]?.field ?? layerEnc?.[channel]?.field;
    return Boolean(field && (top?.[channel]?.type || top?.[channel]));
  });
}

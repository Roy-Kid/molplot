import type { BarChartConfig, BarSeriesConfig } from "./bar_chart";
import type { GanttChartConfig } from "./gantt_chart";
import { type ChartTheme, vegaConfig } from "./theme";
import type { AxisConfig, LineChartConfig, ScatterChartConfig } from "./types";

/**
 * A Vega-Lite top-level spec. Loosely typed on purpose — the object *is* the
 * portable intermediate language, produced identically here (TypeScript) and
 * by the Python package, then rendered either by vega-embed (web) or by the
 * matplotlib translator (paper). Keep these builders pure and free of DOM /
 * engine references so they stay node-testable and reusable on both sides.
 */
export type VegaLiteSpec = Record<string, unknown>;

export const VL_SCHEMA = "https://vega.github.io/schema/vega-lite/v5.json";

export interface SpecSize {
  width?: number | "container";
  height?: number;
}

const FALLBACK_STATUS_COLOR = "#a3a3a3";

/** Strip undefined so specs compare cleanly in tests and serialize small. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) delete obj[k];
  }
  return obj;
}

function axisDef(cfg: AxisConfig | undefined): Record<string, unknown> {
  return clean({
    title: cfg?.label ?? null,
    format: cfg?.tickformat,
    tickCount: cfg?.nticks,
    grid: true,
  });
}

function scaleDef(cfg: AxisConfig | undefined): Record<string, unknown> {
  const zero = cfg?.rangemode === "tozero" || cfg?.rangemode === "nonnegative";
  return clean({
    type: cfg?.type === "log" ? "log" : "linear",
    domain: cfg?.range,
    zero,
    nice: !cfg?.range,
  });
}

function size(spec: SpecSize | undefined): {
  width: number | "container";
  height: number;
} {
  return { width: spec?.width ?? "container", height: spec?.height ?? 300 };
}

/** LINE — one path per series, per-series width/opacity via nominal scales. */
export function lineSpec(
  config: LineChartConfig,
  theme: ChartTheme,
  spec?: SpecSize,
): VegaLiteSpec {
  const keys: string[] = [];
  const colors: string[] = [];
  const widths: number[] = [];
  const opacities: number[] = [];
  const markerKeys: string[] = [];
  config.series.forEach((s, i) => {
    const key = s.label ?? s.id;
    if (keys.includes(key)) return;
    keys.push(key);
    colors.push(s.color ?? theme.palette[i % theme.palette.length]);
    widths.push(s.width ?? theme.geometry.lineWidth);
    opacities.push(s.opacity ?? 1);
    if ((s.mode ?? "lines") === "lines+markers") markerKeys.push(key);
  });

  const { width, height } = size(spec);
  const colorEnc = {
    field: "key",
    type: "nominal",
    scale: { domain: keys, range: colors },
    legend: config.showLegend ? { title: null } : null,
  };
  const xy = {
    x: {
      field: "x",
      type: "quantitative",
      axis: axisDef(config.xAxis),
      scale: scaleDef(config.xAxis),
    },
    y: {
      field: "y",
      type: "quantitative",
      axis: axisDef(config.yAxis),
      scale: scaleDef(config.yAxis),
    },
  };

  return clean({
    $schema: VL_SCHEMA,
    config: vegaConfig(theme),
    width,
    height,
    autosize: { type: "fit", contains: "padding" },
    data: { name: "table" },
    encoding: xy,
    layer: [
      {
        mark: { type: "line", interpolate: "linear", clip: true },
        encoding: {
          color: colorEnc,
          detail: { field: "s", type: "nominal" },
          strokeWidth: {
            field: "key",
            type: "nominal",
            scale: { domain: keys, range: widths },
            legend: null,
          },
          opacity: {
            field: "key",
            type: "nominal",
            scale: { domain: keys, range: opacities },
            legend: null,
          },
        },
      },
      {
        transform: [{ filter: { field: "key", oneOf: markerKeys } }],
        mark: {
          type: "point",
          filled: true,
          size: theme.geometry.markerSize ** 2,
        },
        encoding: { color: colorEnc },
      },
      {
        // Invisible wide hit target → precise hover tooltip + click datum.
        mark: { type: "point", opacity: 0, size: 160 },
        encoding: {
          color: colorEnc,
          tooltip: [
            { field: "key", type: "nominal", title: "series" },
            { field: "x", type: "quantitative", format: ".4g" },
            { field: "y", type: "quantitative", format: ".4g" },
          ],
        },
      },
    ],
  });
}

/** SCATTER — points + optional highlight ring + optional colour channel. */
export function scatterSpec(
  config: ScatterChartConfig,
  theme: ChartTheme,
  spec?: SpecSize,
): VegaLiteSpec {
  const marker = config.marker ?? {};
  const colorArr = Array.isArray(marker.color) ? marker.color : null;
  const numeric = colorArr !== null && typeof colorArr[0] === "number";
  const { width, height } = size(spec);

  let colorEnc: Record<string, unknown> | undefined;
  if (numeric) {
    colorEnc = {
      field: "c",
      type: "quantitative",
      scale: { scheme: marker.colorscale ?? theme.scheme.sequential },
      legend: marker.showscale ? {} : null,
    };
  } else if (colorArr) {
    colorEnc = { field: "c", type: "nominal", scale: null, legend: null };
  }
  const markSize = (marker.size ?? theme.geometry.markerSize) ** 2;

  const layers: Record<string, unknown>[] = [
    {
      data: { name: "table" },
      mark: clean({
        type: "point",
        filled: true,
        size: markSize,
        color: colorEnc
          ? undefined
          : ((marker.color as string) ?? theme.palette[0]),
      }),
      encoding: clean({
        x: {
          field: "x",
          type: "quantitative",
          axis: axisDef(config.xAxis),
          scale: scaleDef(config.xAxis),
        },
        y: {
          field: "y",
          type: "quantitative",
          axis: axisDef(config.yAxis),
          scale: scaleDef(config.yAxis),
        },
        color: colorEnc,
        tooltip: [
          { field: "x", type: "quantitative", format: ".4g" },
          { field: "y", type: "quantitative", format: ".4g" },
        ],
      }),
    },
    {
      data: { name: "highlight" },
      mark: {
        type: "point",
        filled: false,
        size: markSize * 4,
        stroke: theme.highlightRing,
        strokeWidth: 2,
      },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    },
  ];

  return clean({
    $schema: VL_SCHEMA,
    config: vegaConfig(theme),
    width,
    height,
    autosize: { type: "fit", contains: "padding" },
    layer: layers,
  });
}

/** BAR — stack / group / overlay, vertical or horizontal, line-over-bars. */
export function barSpec(
  config: BarChartConfig,
  theme: ChartTheme,
  spec?: SpecSize,
): VegaLiteSpec {
  const mode = config.mode ?? "group";
  const horizontal = (config.orientation ?? "v") === "h";
  const { width, height } = size(spec);

  const keys: string[] = [];
  const colors: string[] = [];
  config.series.forEach((s: BarSeriesConfig, i) => {
    const key = s.label ?? s.id;
    if (keys.includes(key)) return;
    keys.push(key);
    colors.push(s.color ?? theme.palette[i % theme.palette.length]);
  });
  const colorEnc = {
    field: "key",
    type: "nominal",
    scale: { domain: keys, range: colors },
    legend: config.showLegend ? { title: null } : null,
  };

  const catAxis = horizontal ? config.yAxis : config.xAxis;
  const valAxis = horizontal ? config.xAxis : config.yAxis;
  const catChannel = horizontal ? "y" : "x";
  const valChannel = horizontal ? "x" : "y";
  const offsetChannel = horizontal ? "yOffset" : "xOffset";

  const catEnc = {
    field: "cat",
    type: "nominal",
    axis: axisDef(catAxis),
    scale: { paddingInner: config.bargap ?? theme.geometry.barGap },
  };
  const valEnc: Record<string, unknown> = {
    field: "val",
    type: "quantitative",
    axis: axisDef(valAxis),
    stack: mode === "stack" ? true : null,
  };

  const barEncoding: Record<string, unknown> = clean({
    [catChannel]: catEnc,
    [valChannel]: valEnc,
    color: colorEnc,
    [offsetChannel]: mode === "group" ? { field: "key" } : undefined,
    opacity: mode === "overlay" ? { value: 0.65 } : undefined,
    tooltip: [
      { field: "cat", type: "nominal" },
      { field: "val", type: "quantitative", format: ".4g" },
      { field: "key", type: "nominal", title: "series" },
    ],
  });

  const layers: Record<string, unknown>[] = [
    { data: { name: "table" }, mark: { type: "bar" }, encoding: barEncoding },
  ];

  // Optional line-over-bars overlay (fed via the "line" dataset).
  const hasLine = config.series.some((s) => s.type === "line");
  if (hasLine) {
    layers.push({
      data: { name: "line" },
      mark: { type: "line", point: true, strokeWidth: 2 },
      encoding: {
        [catChannel]: { field: "cat", type: "nominal" },
        [valChannel]: { field: "val", type: "quantitative" },
        color: colorEnc,
        detail: { field: "key", type: "nominal" },
      },
    });
  }

  return clean({
    $schema: VL_SCHEMA,
    config: vegaConfig(theme),
    width,
    height,
    autosize: { type: "fit", contains: "padding" },
    layer: layers,
  });
}

/** GANTT — one time-spanning bar per task, coloured by status group. */
export function ganttSpec(
  config: GanttChartConfig,
  theme: ChartTheme,
  spec?: SpecSize,
): VegaLiteSpec {
  const present = [...new Set(config.tasks.map((t) => t.statusGroup))];
  const order = config.statusOrder ?? [];
  const groups = [
    ...order.filter((g) => present.includes(g)),
    ...present.filter((g) => !order.includes(g)),
  ];
  const groupLabels = groups.map((g) => config.statusLabels?.[g] ?? g);
  const colors = groups.map(
    (g) => config.statusColors[g] ?? FALLBACK_STATUS_COLOR,
  );
  const opacities = groups.map((g) => config.statusOpacity?.[g] ?? 1);
  const labelOrder = [...new Set(config.tasks.map((t) => t.label))];

  const barWidth = config.barWidth ?? 18;
  const rowHeight = config.rowHeight ?? 28;
  const padding = Math.max(0.05, Math.min(0.7, 1 - barWidth / rowHeight));
  const { width } = size(spec);
  const height =
    spec?.height ?? Math.max(160, rowHeight * labelOrder.length + 40);

  return clean({
    $schema: VL_SCHEMA,
    config: vegaConfig(theme),
    width,
    height,
    autosize: { type: "fit", contains: "padding" },
    data: { name: "table" },
    mark: { type: "bar", cornerRadius: 2 },
    encoding: {
      x: {
        field: "start",
        type: "temporal",
        axis: axisDef(config.xAxis),
        title: null,
      },
      x2: { field: "end" },
      y: {
        field: "label",
        type: "nominal",
        sort: labelOrder,
        scale: { paddingInner: padding },
        axis: { title: null },
      },
      color: {
        field: "groupLabel",
        type: "nominal",
        scale: { domain: groupLabels, range: colors },
        legend:
          (config.showLegend ?? true)
            ? { title: null, orient: "bottom" }
            : null,
      },
      opacity: {
        field: "group",
        type: "nominal",
        scale: { domain: groups, range: opacities },
        legend: null,
      },
      tooltip: [
        { field: "label", type: "nominal" },
        { field: "start", type: "temporal" },
        { field: "end", type: "temporal" },
        { field: "groupLabel", type: "nominal", title: "status" },
      ],
    },
  });
}

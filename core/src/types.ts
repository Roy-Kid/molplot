export type ThemeMode = "light" | "dark" | "auto";

export interface SeriesPoint {
  x: number;
  y: number;
}

export interface LineSeriesConfig {
  id: string;
  label?: string;
  color?: string;
  initialPoints?: SeriesPoint[];
  /** Per-series hover format (d3-format spec for the y value). */
  hovertemplate?: string;
  /** Default ``2`` — width in pixels of the line stroke. */
  width?: number;
  /** Trace opacity in ``[0, 1]``. Default ``1`` (opaque). Lower to fade a
   * background trace (e.g. the raw signal behind a smoothed overlay). */
  opacity?: number;
  /** ``"lines"`` (default) or ``"lines+markers"``. */
  mode?: "lines" | "lines+markers";
}

export interface AxisConfig {
  label?: string;
  type?: "linear" | "log";
  range?: [number, number];
  /** d3-format string for tick labels (e.g. ".2s", "%"). */
  tickformat?: string;
  /** Hint for the maximum number of ticks to draw. */
  nticks?: number;
  /** Stay above zero / below zero. Mirrors the former plotly ``rangemode``. */
  rangemode?: "normal" | "tozero" | "nonnegative";
  /** Grow the plot area to fit long tick labels. */
  automargin?: boolean;
  /** Per-axis tick font override (size + colour). */
  tickfont?: { size?: number; color?: string };
}

export interface LegendConfig {
  /** ``"h"`` (horizontal, below) or ``"v"`` (vertical, right). */
  orientation?: "h" | "v";
  /** Paper-coords y offset (e.g. ``-0.3`` floats legend below the plot). */
  y?: number;
  /** Paper-coords x offset. */
  x?: number;
  font?: { size?: number; color?: string };
}

export interface LineChartConfig {
  series: LineSeriesConfig[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  /** Sliding window in points per series. null = unbounded. */
  windowSize?: number | null;
  /** Interaction toolbar visible. Default false to match sidebar density. */
  modebar?: boolean;
  /** Retained for API compatibility; buttons are advisory under the D3 renderer. */
  modebarRemove?: string[];
  /** Default hover format applied to every series that does not set its own. */
  hovertemplate?: string;
  /** ``hovermode``; ``"x unified"`` overlays values across series at the same x. */
  hovermode?: "closest" | "x" | "x unified";
  /** Show legend strip. Default false. */
  showLegend?: boolean;
  /** Light/dark; "auto" tracks <html class="dark">. */
  theme?: ThemeMode;
  /** Named preset from presets/*.json. Default "molplot". */
  preset?: string;
}

export interface LineChartClickEvent {
  seriesId: string;
  index: number;
  x: number;
  y: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  customdata?: unknown;
}

export interface ScatterMarkerConfig {
  size?: number;
  /** Single color string, per-point color array, or numeric column. */
  color?: string | string[] | number[];
  /** Named colour scheme shared with matplotlib (e.g. "viridis"). */
  colorscale?: string;
  showscale?: boolean;
}

export interface ScatterChartConfig {
  points: ScatterPoint[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  marker?: ScatterMarkerConfig;
  /** Optional ring overlay for a single point. */
  highlight?: { index: number };
  modebar?: boolean;
  theme?: ThemeMode;
  /** Named preset from presets/*.json. Default "molplot". */
  preset?: string;
  /** Hover format for the (x, y) readout. Default ".3f". */
  hovertemplate?: string;
}

export interface ScatterClickEvent {
  index: number;
  x: number;
  y: number;
  customdata?: unknown;
}

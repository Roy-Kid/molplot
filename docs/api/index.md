# API Reference

## TypeScript — `@molcrafts/molplot`

**Chart classes** — `LineChart`, `ScatterChart`, `BarChart`, `GanttChart`,
`RawChart`. Constructor `(container: HTMLElement, config)`; common methods
`ready()`, `resize()`, `dispose()`; typed `on*Click(cb) → unsubscribe`.

**Spec builders** — `lineSpec(config, theme, size?)`, `scatterSpec`, `barSpec`,
`ganttSpec` → `VegaLiteSpec`. `VL_SCHEMA`.

**Theme / preset** — `resolveTheme(mode, preset?)`, `vegaConfig(theme)`,
`getPreset(name?)`, `presetNames()`, `PRESETS`, `DEFAULT_PRESET`,
`CHART_PALETTE`, `CHART_DEFAULT_COLOR`.

**Types** — `LineChartConfig`, `LineSeriesConfig`, `SeriesPoint`,
`ScatterChartConfig`, `ScatterPoint`, `ScatterMarkerConfig`, `BarChartConfig`,
`BarSeriesConfig`, `BarPoint`, `BarMode`, `GanttChartConfig`, `GanttTask`,
`RawChartConfig`, `AxisConfig`, `LegendConfig`, `ThemeMode`, and the `*ClickEvent`
types.

## Python — `molcrafts-molplot`

**Style** — `use(name, mode)`, `style(name, mode)` (context manager),
`available()`, `register()`, `science_base(name)`.

**Preset / tokens** — `get_preset(name)`, `resolve(name, mode)`,
`rc_params(name, mode)`, `vega_config(name, mode)`, `PRESET_NAMES`,
`DEFAULT_PRESET`.

**Palette** — `palette(name)`, `cycle(name)`, `color(i, name)`,
`default_color`, `sequential`, `diverging`.

**Spec builders** — `line_spec`, `scatter_spec`, `bar_spec`, `gantt_spec`,
`VL_SCHEMA`.

**Render** — `render(spec, preset, mode, ax)`; one-call `line`, `scatter`,
`bar`, `gantt`. Exact web parity: `to_png(spec, path)`, `to_svg(spec, path)`.

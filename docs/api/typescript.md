# TypeScript

```sh
npm install @molcrafts/molplot
```

| Import | |
|--------|--|
| `@molcrafts/molplot` | classes, builders, theme, `defineMolplotChart` |
| `@molcrafts/molplot/elements` | registers `<molplot-chart>` |

## Classes

`(container, config)`. Shared: `ready()`, `resize()`, `dispose()`.

| | Config | Click |
|--|--------|-------|
| `LineChart` | `LineChartConfig` | `onPointClick` |
| `ScatterChart` | `ScatterChartConfig` | `onPointClick` |
| `BarChart` | `BarChartConfig` | `onBarClick` |
| `GanttChart` | `GanttChartConfig` | `onTaskClick` |
| `RawChart` | `{ spec }` | — |

`LineChart`: `setSeries`, `appendPoint(s)`, `clear`, `setWindow`, `setAxisRange`. `ScatterChart.setHighlight`. Bar `mode`: `group` / `stack` / `overlay`. Gantt field: `statusGroup`.

## Builders and theme

`lineSpec(config, theme, size?)`, `scatterSpec`, `barSpec`, `ganttSpec`. `VL_SCHEMA`. `getPreset`, `presetNames`, `PRESETS`, `DEFAULT_PRESET`, `resolveTheme`, `vegaConfig`, `CHART_PALETTE`.

## Element

`defineMolplotChart()` registers the element. Use `parseSpec` and `readSpec` to read its specification. Attributes include `preset`, `theme`, `interactive`, `width`, `aspect`, `spec`, and `mode` (`readonly` by default or `edit`). The chart fills its host. It emits `molplot:ready` and `molplot:error`.

The MolCrafts preview header from `@molcrafts/ui/preview` includes view controls and an export action. The action opens the shared image export dialog with manual cropping, automatic cropping to transparent margins, output dimensions, and PNG or vector SVG output. The MolPlot workbench downloads Matplotlib figures in the formats supplied by its Python backend, including PDF.

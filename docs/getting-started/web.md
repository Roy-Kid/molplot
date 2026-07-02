# Web (Vega-Lite)

```sh
npm install @molcrafts/molplot vega vega-lite vega-embed
```

Every chart is an imperative class taking `(container, config)`. The Vega
runtime loads lazily, so nothing ships until you draw a chart.

```ts
import { LineChart } from "@molcrafts/molplot";

const chart = new LineChart(el, {
  preset: "molplot",        // unified preset
  theme: "auto",            // tracks <html class="dark">
  showLegend: true,
  xAxis: { label: "step" },
  yAxis: { label: "energy" },
  series: [{ id: "e", label: "Energy", initialPoints: [{ x: 0, y: 1 }] }],
});

await chart.ready();
chart.appendPoint("e", { x: 1, y: 2 });   // cheap streaming update
const off = chart.onPointClick((e) => console.log(e.seriesId, e.index));
// ...
off();
chart.dispose();
```

## Charts

| Class | Purpose | Key methods |
|-------|---------|-------------|
| `LineChart` | streaming time series | `setSeries`, `appendPoint(s)`, `clear`, `setWindow`, `setAxisRange`, `onPointClick` |
| `ScatterChart` | points + highlight + colour channel | `update`, `setHighlight`, `onPointClick` |
| `BarChart` | stack / group / overlay, v/h, line-over-bars | `update`, `onBarClick` |
| `GanttChart` | time-spanning bars by status group | `update`, `onTaskClick` |
| `RawChart` | render an arbitrary Vega-Lite spec | `update({ spec })` |

## Spec builders

Need the spec without a DOM (SSR, tests, shipping to Python)? Use the pure
builders: `lineSpec`, `scatterSpec`, `barSpec`, `ganttSpec` — each returns a
Vega-Lite spec with the unified preset injected as `config`.

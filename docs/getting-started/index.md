# Getting Started

MolPlot ships two packages that share one preset and one spec format. Pick the
renderer for your surface — or use both and let the Vega-Lite spec bridge them.

- [Web (Vega-Lite)](web.md) — `npm install @molcrafts/molplot`
- [Python (scienceplots)](python.md) — `pip install molcrafts-molplot`
- [The unified preset](preset.md) — how one token file drives both renderers

## The idea in one example

Build a spec in Python, render it to a publication figure, and hand the *same*
JSON to the browser for an interactive version:

```python
import molplot, json

spec = molplot.line_spec(
    [{"id": "E", "x": steps, "y": energy}],
    x_label="step", y_label="energy (kcal/mol)",
)
fig, ax = molplot.render(spec)        # matplotlib + scienceplots
open("chart.vl.json", "w").write(json.dumps(spec))
```

```ts
import { RawChart } from "@molcrafts/molplot";
new RawChart(container, { spec: await (await fetch("chart.vl.json")).json() });
```

# MolPlot

Unified scientific charting for the MolCrafts stack. **One preset, one
intermediate language, two renderers.**

- **Web** — `@molcrafts/molplot` renders [Vega-Lite](https://vega.github.io/vega-lite/)
  specs in the browser via `vega-embed`.
- **Paper** — `molcrafts-molplot` wraps [scienceplots](https://github.com/garrettj403/SciencePlots)
  and renders the *same* Vega-Lite spec to matplotlib.

A chart is described once as a Vega-Lite JSON spec (the portable intermediate
language). The unified preset — defined once in `presets/*.json` — compiles to a
Vega-Lite `config` on the web and to matplotlib `rcParams` (over scienceplots) in
Python, so a dashboard chart and a manuscript figure share palette, type scale,
and grid.

```
                      presets/*.json   ← single source of truth
                     /              \
        vegaConfig() (TS)      rc_params() (Python)
             |                        |
   Vega-Lite spec  ───────────────►  Vega-Lite spec
       |                                  |
  vega-embed (web)              render() → matplotlib (paper)
```

See [Getting Started](getting-started/index.md).

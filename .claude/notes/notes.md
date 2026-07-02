# Notes

Evolving design decisions. Newest first. `/mol:note` appends here; keep each
entry short (decision + why).

## 2026-07-03 — Vega-Lite is the intermediate language

Charts are defined once as a Vega-Lite JSON spec. The web renderer (`core/`,
`vega-embed`) and the Python renderer (`python/`, matplotlib) both consume the
*same* spec, so a chart round-trips between browser and paper. Pure spec builders
live in `core/src/specs.ts` and `python/src/molplot/specs.py` and **must stay
structurally identical** (same field names). Chose Vega-Lite over Observable Plot
(an abandoned first attempt) precisely for this portable-spec interop.

## 2026-07-03 — Unified preset = single source of truth

Design tokens live only in `presets/*.json`. `scripts/build-presets.mjs`
compiles them to a typed TS const, a Python dict, and `.mplstyle` files
(CI drift-guards with `npm run check:presets`). The same tokens become a
Vega-Lite `config` (web) and matplotlib `rcParams` layered on scienceplots
(paper). Never hand-edit a generated file. `.mplstyle` colours omit the leading
`#` (matplotlibrc treats `#` as a comment).

## 2026-07-03 — Preserve the npm public API

`@molcrafts/molplot` is consumed downstream (molvis, molexp). The chart classes,
their `ready`/`resize`/`dispose`/`on*Click` surface, `LineChart` streaming
methods, and all exported config/event type names are a contract. The one
intentional break vs the old plotly build: `RawChart` takes a Vega-Lite `{spec}`.

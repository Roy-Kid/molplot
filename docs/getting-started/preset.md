# The Unified Preset

A preset is a set of design tokens — palette, type scale, geometry, and light/
dark colours — defined once in `presets/<name>.json` and validated against
`presets/preset.schema.json`. It is the **single source of truth** for both
renderers.

`scripts/build-presets.mjs` compiles each preset into:

| Output | Consumed by |
|--------|-------------|
| `core/src/presets/generated.ts` | the TypeScript renderer (typed const) |
| `python/src/molplot/presets/_generated.py` | the Python renderer (dict) |
| `python/src/molplot/presets/<name>[-dark].mplstyle` | `plt.style.use("<name>")` |

From those tokens each side builds its native theme:

- **Web** — `vegaConfig(theme)` → a Vega-Lite `config` merged into every spec.
- **Python** — `rc_params(name, mode)` → matplotlib `rcParams`, layered on the
  scienceplots base named by the preset's `sciencePlotsBase`.

Because both derive from the same numbers, a chart looks the same in a browser
and in a paper.

## Editing a preset

1. Edit `presets/<name>.json` (or add a new file).
2. Run `npm run build:presets`.
3. Commit both the JSON and the regenerated files — CI runs
   `npm run check:presets` and fails on drift.

Two presets ship by default: **`molplot`** (sans-serif, screen-oriented) and
**`molplot-paper`** (serif, high-DPI, layered on scienceplots' `nature` base).
Both use the same categorical palette so colour identity survives the switch.

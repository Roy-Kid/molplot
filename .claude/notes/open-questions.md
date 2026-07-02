# Open questions / deferred work

Captured during bootstrap (2026-07-03). Resolve or delete as they close.

- **Agent-emitted plot artifacts must move to Vega-Lite.** molexp's agent/server
  currently emits *plotly* `{data, layout}` for `kind: "plot"` artifacts; the
  repointed molexp UI now renders Vega-Lite specs and shows a migration hint for
  legacy plotly. The server/agent side still needs to emit VL specs.

- **Publish `@molcrafts/molplot@0.1.0` (npm) + `molcrafts-molplot` (PyPI).**
  GitHub repos `Roy-Kid/molplot` + `MolCrafts/molplot` don't exist yet; nothing
  pushed. After publishing, swap the local source-link / `file:` wiring in molvis
  and molexp back to a normal version range.

- **molvis + molexp detach/repoint changes are uncommitted** in those repos
  (working-tree only). molexp's tree also carries unrelated pre-existing edits —
  never blanket-commit it.

- **Per-series line width/opacity** emits Vega-Lite "unsorted discrete field"
  hints when they vary across series (the rare fade-background path). Cosmetic;
  renders correctly. Revisit if it becomes noisy.

- **Aggregate mirror.** How/whether this repo registers in the molcrafts
  aggregate-mirror sync (`repos.toml`) is unsettled — see the monorepo layout.

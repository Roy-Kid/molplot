# .claude/notes — passive project knowledge

Long-lived internal context for agents working on MolPlot. Outlives any single
feature. **Not** public docs (those live in `docs/`), **not** active runtime
specs (those live in `.claude/specs/`, deleted on completion).

| File | What it holds |
|------|---------------|
| `notes.md` | Evolving design decisions and rationale. `/mol:note` appends here. |
| `architecture.md` | Project blueprint (modules, public surface, layer roles). Populated by `/mol:map`; read by the `librarian` at spec time. |
| `open-questions.md` | Unresolved questions / deferred work. Filled in over time. |

Add `contracts/`, `rubrics/`, `decisions/`, `debt/`, `handoffs/` only when there
is real content for them — empty directories are not value.

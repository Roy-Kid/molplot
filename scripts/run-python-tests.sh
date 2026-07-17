#!/usr/bin/env bash
# Resolve a Python interpreter that can import pytest, then run the suite.
# Prefer an active venv / repo-local .venv over bare `python3` (Homebrew
# 3.14 is often PEP-668-blocked and has no pytest).
set -euo pipefail
cd "$(dirname "$0")/../python"

pick_python() {
  local candidates=()
  if [[ -n "${VIRTUAL_ENV:-}" && -x "${VIRTUAL_ENV}/bin/python" ]]; then
    candidates+=("${VIRTUAL_ENV}/bin/python")
  fi
  if [[ -x "../.venv/bin/python" ]]; then
    candidates+=("../.venv/bin/python")
  fi
  if [[ -x ".venv/bin/python" ]]; then
    candidates+=(".venv/bin/python")
  fi
  # Prefer known-good versions before the bare `python3` symlink.
  for py in python3.12 python3.11 python3; do
    if command -v "$py" >/dev/null 2>&1; then
      candidates+=("$(command -v "$py")")
    fi
  done

  local py
  for py in "${candidates[@]}"; do
    if "$py" -c "import pytest" 2>/dev/null; then
      printf '%s\n' "$py"
      return 0
    fi
  done
  return 1
}

if ! PY="$(pick_python)"; then
  cat >&2 <<'EOF'
error: no Python with pytest found for molplot pre-commit/pre-push.

Install the package (and pytest) into a venv, then re-run:

  python3.12 -m venv .venv
  .venv/bin/pip install -e './python[dev]'
  # or:  pip install -e './python[dev]'   inside an activated venv

Bare Homebrew python3 is not used when it cannot import pytest (PEP 668).
EOF
  exit 1
fi

echo "python tests: using $PY"
exec "$PY" -m pytest -q

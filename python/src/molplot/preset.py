"""Preset resolution — the Python half of the unified preset.

The canonical design tokens live in ``presets/*.json`` at the repo root and are
compiled by ``scripts/build-presets.mjs`` into :mod:`molplot.presets._generated`
(shared verbatim with the TypeScript renderer) plus one ``.mplstyle`` per
preset/mode. This module turns those tokens into matplotlib ``rcParams`` so a
figure drawn here matches the same preset rendered in the browser.
"""

from __future__ import annotations

from typing import Any, Literal

from cycler import cycler

from .presets._generated import DEFAULT_PRESET, PRESET_NAMES, PRESETS

Mode = Literal["light", "dark"]

__all__ = [
    "DEFAULT_PRESET",
    "PRESET_NAMES",
    "get_preset",
    "resolve",
    "rc_params",
]


def get_preset(name: str = DEFAULT_PRESET) -> dict[str, Any]:
    """Return the raw token dict for a preset, falling back to the default."""
    return PRESETS.get(name, PRESETS[DEFAULT_PRESET])


def _is_serif(family: str) -> bool:
    primary = family.split(",")[0].strip().lower()
    if "sans" in primary:
        return False
    return any(m in primary for m in ("serif", "times", "roman", "georgia", "garamond", "nimbus"))


def resolve(name: str = DEFAULT_PRESET, mode: Mode = "light") -> dict[str, Any]:
    """Resolve a preset + mode into a flat theme dict (colours, type scale).

    Mirrors the TypeScript ``resolveTheme`` so both renderers read the same
    numbers from the same tokens.
    """
    p = get_preset(name)
    m = p["modes"]["dark" if mode == "dark" else "light"]
    return {
        "name": p["name"],
        "mode": mode,
        "palette": list(p["palette"]["categorical"]),
        "default_color": p["palette"]["defaultColor"],
        "sequential": p["palette"]["sequential"],
        "diverging": p["palette"]["diverging"],
        "font_family": p["typography"]["family"],
        "font_size": dict(p["typography"]["size"]),
        "geometry": dict(p["geometry"]),
        "foreground": m["foreground"],
        "grid_color": m["gridColorSolid"],
        "tick_color": m["tickColor"],
        "figure_face": m["figureFace"],
        "highlight_ring": m["highlightRing"],
        "science_base": list(p["sciencePlotsBase"]),
    }


def rc_params(name: str = DEFAULT_PRESET, mode: Mode = "light") -> dict[str, Any]:
    """Build the matplotlib rcParams overlay for a preset/mode.

    This is applied *on top of* the scienceplots base styles (see
    :func:`molplot.style.use`) so the categorical palette, type scale, grid,
    and light/dark colours match the Vega-Lite ``config`` exactly.
    """
    t = resolve(name, mode)
    geo = t["geometry"]
    sizes = t["font_size"]
    serif = _is_serif(t["font_family"])
    families = [f.strip() for f in t["font_family"].split(",")]
    rc: dict[str, Any] = {
        "figure.figsize": tuple(geo["figSize"]),
        "figure.dpi": geo["dpi"],
        "savefig.dpi": geo["dpi"],
        "savefig.bbox": "tight",
        "figure.facecolor": t["figure_face"],
        "axes.facecolor": t["figure_face"],
        "savefig.facecolor": t["figure_face"],
        "font.family": "serif" if serif else "sans-serif",
        ("font.serif" if serif else "font.sans-serif"): families,
        "font.size": sizes["base"],
        "axes.titlesize": sizes["title"],
        "axes.labelsize": sizes["label"],
        "xtick.labelsize": sizes["tick"],
        "ytick.labelsize": sizes["tick"],
        "legend.fontsize": sizes["legend"],
        "axes.prop_cycle": cycler(color=t["palette"]),
        "lines.linewidth": geo["lineWidth"],
        "lines.markersize": geo["markerSize"],
        "text.color": t["foreground"],
        "axes.edgecolor": t["foreground"],
        "axes.labelcolor": t["foreground"],
        "xtick.color": t["foreground"],
        "ytick.color": t["foreground"],
        "axes.grid": True,
        "grid.color": t["grid_color"],
        "grid.linewidth": 0.5,
        "axes.axisbelow": True,
        "legend.frameon": False,
    }
    return rc

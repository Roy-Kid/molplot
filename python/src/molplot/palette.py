"""Palette helpers — the categorical cycle and named colour schemes shared
with the web renderer (same tokens, same scheme names)."""

from __future__ import annotations

from .preset import DEFAULT_PRESET, get_preset

__all__ = ["palette", "cycle", "color", "default_color", "sequential", "diverging"]


def palette(name: str = DEFAULT_PRESET) -> list[str]:
    """The full categorical palette for a preset."""
    return list(get_preset(name)["palette"]["categorical"])


# `cycle` mirrors the molpack-paper helper: the active categorical colours.
cycle = palette


def color(index: int, name: str = DEFAULT_PRESET) -> str:
    """The ``index``-th categorical colour, wrapping around."""
    cats = palette(name)
    return cats[index % len(cats)]


def default_color(name: str = DEFAULT_PRESET) -> str:
    return get_preset(name)["palette"]["defaultColor"]


def sequential(name: str = DEFAULT_PRESET) -> str:
    """Name of the sequential colour scheme (e.g. 'viridis') — valid for both
    matplotlib (`plt.get_cmap`) and Vega-Lite."""
    return get_preset(name)["palette"]["sequential"]


def diverging(name: str = DEFAULT_PRESET) -> str:
    return get_preset(name)["palette"]["diverging"]

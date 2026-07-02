"""Vega-Lite ``config`` builder — the Python mirror of the TypeScript
``vegaConfig``. Injecting this into a spec makes it render (via vl-convert or
the browser) with the same palette, type scale, and grid as the matplotlib
``rcParams`` overlay — two encodings of one preset."""

from __future__ import annotations

from typing import Any

from .preset import DEFAULT_PRESET, Mode, resolve

__all__ = ["vega_config"]


def vega_config(name: str = DEFAULT_PRESET, mode: Mode = "light") -> dict[str, Any]:
    t = resolve(name, mode)
    sizes = t["font_size"]
    return {
        "background": "transparent",
        "font": t["font_family"],
        "padding": 4,
        "axis": {
            "labelColor": t["foreground"],
            "titleColor": t["foreground"],
            "tickColor": t["tick_color"],
            "domainColor": t["tick_color"],
            "gridColor": t["grid_color"],
            "gridWidth": 0.5,
            "labelFontSize": sizes["tick"],
            "titleFontSize": sizes["label"],
            "labelFont": t["font_family"],
            "titleFont": t["font_family"],
            "grid": True,
            "tickSize": 4,
        },
        "legend": {
            "labelColor": t["foreground"],
            "titleColor": t["foreground"],
            "labelFontSize": sizes["legend"],
            "titleFontSize": sizes["legend"],
            "labelFont": t["font_family"],
            "titleFont": t["font_family"],
            "symbolType": "circle",
        },
        "title": {
            "color": t["foreground"],
            "fontSize": sizes["title"],
            "font": t["font_family"],
            "fontWeight": 600,
        },
        "view": {"stroke": None, "continuousWidth": 320, "continuousHeight": 200},
        "line": {"strokeWidth": t["geometry"]["lineWidth"]},
        "point": {"size": t["geometry"]["markerSize"] ** 2},
        "range": {
            "category": list(t["palette"]),
            "ramp": {"scheme": t["sequential"]},
            "diverging": {"scheme": t["diverging"]},
        },
    }

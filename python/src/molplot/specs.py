"""Vega-Lite spec builders — the Python side of the portable intermediate
language. Structurally identical to ``core/src/specs.ts`` but self-contained
(inline ``data.values``), so a spec built here renders in the browser
(vega-embed / RawChart), through vl-convert, *or* to matplotlib via
:func:`molplot.render.render`. That equivalence is the whole point of routing
through Vega-Lite: one spec, three renderers.
"""

from __future__ import annotations

from typing import Any, Sequence

from .preset import DEFAULT_PRESET, Mode, resolve
from .vega_config import vega_config

__all__ = ["line_spec", "scatter_spec", "bar_spec", "gantt_spec", "VL_SCHEMA"]

VL_SCHEMA = "https://vega.github.io/schema/vega-lite/v5.json"
_FALLBACK_STATUS = "#a3a3a3"


def _clean(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}


def _axis(label: str | None) -> dict[str, Any]:
    return {"title": label, "grid": True}


def _scale(log: bool, domain: Sequence[float] | None) -> dict[str, Any]:
    return _clean(
        {
            "type": "log" if log else "linear",
            "domain": list(domain) if domain else None,
            "zero": False,
            "nice": domain is None,
        }
    )


def _base(name: str, mode: Mode, width: Any, height: int) -> dict[str, Any]:
    return {
        "$schema": VL_SCHEMA,
        "config": vega_config(name, mode),
        "width": width,
        "height": height,
        "autosize": {"type": "fit", "contains": "padding"},
    }


def line_spec(
    series: Sequence[dict[str, Any]],
    *,
    x_label: str | None = None,
    y_label: str | None = None,
    x_log: bool = False,
    y_log: bool = False,
    x_domain: Sequence[float] | None = None,
    y_domain: Sequence[float] | None = None,
    show_legend: bool = False,
    preset: str = DEFAULT_PRESET,
    mode: Mode = "light",
    width: Any = "container",
    height: int = 300,
) -> dict[str, Any]:
    """Line spec. ``series`` = ``[{id, label?, color?, x:[...], y:[...],
    width?, opacity?, mode?}]``."""
    theme = resolve(preset, mode)
    keys: list[str] = []
    colors: list[str] = []
    widths: list[float] = []
    opacities: list[float] = []
    marker_keys: list[str] = []
    rows: list[dict[str, Any]] = []
    for i, s in enumerate(series):
        key = s.get("label", s["id"])
        if key not in keys:
            keys.append(key)
            colors.append(s.get("color", theme["palette"][i % len(theme["palette"])]))
            widths.append(s.get("width", theme["geometry"]["lineWidth"]))
            opacities.append(s.get("opacity", 1))
            if s.get("mode", "lines") == "lines+markers":
                marker_keys.append(key)
        for j, (xv, yv) in enumerate(zip(s["x"], s["y"])):
            rows.append({"s": s["id"], "key": key, "i": j, "x": xv, "y": yv})

    color_enc = {
        "field": "key",
        "type": "nominal",
        "scale": {"domain": keys, "range": colors},
        "legend": {"title": None} if show_legend else None,
    }
    spec = _base(preset, mode, width, height)
    spec.update(
        {
            "data": {"values": rows},
            "encoding": {
                "x": {"field": "x", "type": "quantitative", "axis": _axis(x_label), "scale": _scale(x_log, x_domain)},
                "y": {"field": "y", "type": "quantitative", "axis": _axis(y_label), "scale": _scale(y_log, y_domain)},
            },
            "layer": [
                {
                    "mark": {"type": "line", "interpolate": "linear", "clip": True},
                    "encoding": {
                        "color": color_enc,
                        "detail": {"field": "s", "type": "nominal"},
                        "strokeWidth": {"field": "key", "type": "nominal", "scale": {"domain": keys, "range": widths}, "legend": None},
                        "opacity": {"field": "key", "type": "nominal", "scale": {"domain": keys, "range": opacities}, "legend": None},
                    },
                },
                {
                    "transform": [{"filter": {"field": "key", "oneOf": marker_keys}}],
                    "mark": {"type": "point", "filled": True, "size": theme["geometry"]["markerSize"] ** 2},
                    "encoding": {"color": color_enc},
                },
            ],
        }
    )
    return spec


def scatter_spec(
    x: Sequence[float],
    y: Sequence[float],
    *,
    color: Sequence[Any] | str | None = None,
    colorscale: str | None = None,
    show_scale: bool = False,
    size: float | None = None,
    x_label: str | None = None,
    y_label: str | None = None,
    customdata: Sequence[Any] | None = None,
    preset: str = DEFAULT_PRESET,
    mode: Mode = "light",
    width: Any = "container",
    height: int = 300,
) -> dict[str, Any]:
    """Scatter spec. ``color`` may be a single hex, a per-point list of hexes,
    or a per-point list of numbers (mapped through ``colorscale``)."""
    theme = resolve(preset, mode)
    per_point = isinstance(color, (list, tuple))
    numeric = per_point and len(color) > 0 and isinstance(color[0], (int, float))
    rows: list[dict[str, Any]] = []
    for i, (xv, yv) in enumerate(zip(x, y)):
        row: dict[str, Any] = {"i": i, "x": xv, "y": yv}
        if per_point:
            row["c"] = color[i]
        if customdata is not None:
            row["customdata"] = customdata[i]
        rows.append(row)

    color_enc: dict[str, Any] | None = None
    if numeric:
        color_enc = {"field": "c", "type": "quantitative", "scale": {"scheme": colorscale or theme["sequential"]}, "legend": {} if show_scale else None}
    elif per_point:
        color_enc = {"field": "c", "type": "nominal", "scale": None, "legend": None}

    mark_size = (size or theme["geometry"]["markerSize"]) ** 2
    mark = _clean({"type": "point", "filled": True, "size": mark_size, "color": None if color_enc else (color if isinstance(color, str) else theme["palette"][0])})
    spec = _base(preset, mode, width, height)
    spec.update(
        {
            "data": {"values": rows},
            "mark": mark,
            "encoding": _clean(
                {
                    "x": {"field": "x", "type": "quantitative", "axis": _axis(x_label), "scale": _scale(False, None)},
                    "y": {"field": "y", "type": "quantitative", "axis": _axis(y_label), "scale": _scale(False, None)},
                    "color": color_enc,
                }
            ),
        }
    )
    return spec


def bar_spec(
    categories: Sequence[Any],
    series: Sequence[dict[str, Any]],
    *,
    mode_: str = "group",
    orientation: str = "v",
    show_legend: bool = False,
    bargap: float | None = None,
    x_label: str | None = None,
    y_label: str | None = None,
    preset: str = DEFAULT_PRESET,
    mode: Mode = "light",
    width: Any = "container",
    height: int = 300,
) -> dict[str, Any]:
    """Bar spec. ``series`` = ``[{id, label?, color?, values:[...]}]`` aligned
    to ``categories``. ``mode_`` in {group, stack, overlay}."""
    theme = resolve(preset, mode)
    horizontal = orientation == "h"
    keys: list[str] = []
    colors: list[str] = []
    rows: list[dict[str, Any]] = []
    for i, s in enumerate(series):
        key = s.get("label", s["id"])
        if key not in keys:
            keys.append(key)
            colors.append(s.get("color", theme["palette"][i % len(theme["palette"])]))
        for j, cat in enumerate(categories):
            rows.append({"s": s["id"], "key": key, "i": j, "cat": cat, "val": s["values"][j]})

    cat_channel = "y" if horizontal else "x"
    val_channel = "x" if horizontal else "y"
    offset_channel = "yOffset" if horizontal else "xOffset"
    color_enc = {"field": "key", "type": "nominal", "scale": {"domain": keys, "range": colors}, "legend": {"title": None} if show_legend else None}

    encoding = _clean(
        {
            cat_channel: {"field": "cat", "type": "nominal", "axis": _axis(y_label if horizontal else x_label), "scale": {"paddingInner": bargap if bargap is not None else theme["geometry"]["barGap"]}},
            val_channel: {"field": "val", "type": "quantitative", "axis": _axis(x_label if horizontal else y_label), "stack": True if mode_ == "stack" else None},
            "color": color_enc,
            offset_channel: {"field": "key"} if mode_ == "group" else None,
            "opacity": {"value": 0.65} if mode_ == "overlay" else None,
        }
    )
    spec = _base(preset, mode, width, height)
    spec.update({"data": {"values": rows}, "mark": {"type": "bar"}, "encoding": encoding})
    return spec


def gantt_spec(
    tasks: Sequence[dict[str, Any]],
    status_colors: dict[str, str],
    *,
    status_labels: dict[str, str] | None = None,
    status_opacity: dict[str, float] | None = None,
    status_order: Sequence[str] | None = None,
    row_height: int = 28,
    bar_width: int = 18,
    show_legend: bool = True,
    x_label: str | None = None,
    preset: str = DEFAULT_PRESET,
    mode: Mode = "light",
    width: Any = "container",
    height: int | None = None,
) -> dict[str, Any]:
    """Gantt spec. ``tasks`` = ``[{id, label, start, end, status, customdata?}]``."""
    status_labels = status_labels or {}
    status_opacity = status_opacity or {}
    present = list(dict.fromkeys(t["status"] for t in tasks))
    order = list(status_order or [])
    groups = [g for g in order if g in present] + [g for g in present if g not in order]
    group_labels = [status_labels.get(g, g) for g in groups]
    colors = [status_colors.get(g, _FALLBACK_STATUS) for g in groups]
    opacities = [status_opacity.get(g, 1) for g in groups]
    label_order = list(dict.fromkeys(t["label"] for t in tasks))
    padding = max(0.05, min(0.7, 1 - bar_width / row_height))
    h = height if height is not None else max(160, row_height * len(label_order) + 40)

    rows = [
        {
            "id": t["id"],
            "label": t["label"],
            "start": t["start"],
            "end": t["end"],
            "group": t["status"],
            "groupLabel": status_labels.get(t["status"], t["status"]),
            "customdata": t.get("customdata"),
        }
        for t in tasks
    ]
    spec = _base(preset, mode, width, h)
    spec.update(
        {
            "data": {"values": rows},
            "mark": {"type": "bar", "cornerRadius": 2},
            "encoding": {
                "x": {"field": "start", "type": "temporal", "axis": _axis(x_label), "title": None},
                "x2": {"field": "end"},
                "y": {"field": "label", "type": "nominal", "sort": label_order, "scale": {"paddingInner": padding}, "axis": {"title": None}},
                "color": {"field": "groupLabel", "type": "nominal", "scale": {"domain": group_labels, "range": colors}, "legend": {"title": None, "orient": "bottom"} if show_legend else None},
                "opacity": {"field": "group", "type": "nominal", "scale": {"domain": groups, "range": opacities}, "legend": None},
            },
        }
    )
    return spec

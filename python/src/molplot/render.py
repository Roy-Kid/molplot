"""Vega-Lite → matplotlib renderer.

Reads a self-contained Vega-Lite spec (the kind :mod:`molplot.specs` emits) and
draws it with matplotlib under the unified preset style. This is the concrete
mechanism behind "convert between the web and matplotlib via the Vega-Lite
intermediate language": build one spec, render it in the browser *or* here for a
publication figure.

The translator targets the mark/encoding shapes MolPlot emits (line / point /
bar / gantt). It is spec-driven (it reads fields and colour scales from the
encoding) but not a general Vega-Lite engine — for pixel-exact web parity of an
arbitrary spec, use ``vl-convert`` instead (see :func:`molplot.to_png`).
"""

from __future__ import annotations

from contextlib import nullcontext
from datetime import datetime
from typing import Any, Sequence

from .preset import DEFAULT_PRESET, Mode
from .style import style as _style

__all__ = ["render"]


def _ensure_ax(ax: Any) -> tuple[Any, Any]:
    import matplotlib.pyplot as plt

    if ax is not None:
        return ax.figure, ax
    fig, ax = plt.subplots()
    return fig, ax


def _field(enc: dict[str, Any], channel: str) -> str | None:
    c = enc.get(channel)
    return c.get("field") if isinstance(c, dict) else None


def _color_lookup(color_enc: dict[str, Any] | None) -> tuple[str, dict[Any, str] | str | None]:
    """Return (kind, mapping). kind in {'nominal','quantitative','none'}."""
    if not isinstance(color_enc, dict):
        return "none", None
    if color_enc.get("type") == "quantitative":
        scale = color_enc.get("scale") or {}
        return "quantitative", scale.get("scheme")
    scale = color_enc.get("scale")
    if isinstance(scale, dict) and "domain" in scale and "range" in scale:
        return "nominal", dict(zip(scale["domain"], scale["range"]))
    return "literal", None  # field value *is* the colour


def _scale_map(enc_channel: dict[str, Any] | None) -> dict[Any, float] | None:
    if not isinstance(enc_channel, dict):
        return None
    scale = enc_channel.get("scale")
    if isinstance(scale, dict) and "domain" in scale and "range" in scale:
        return dict(zip(scale["domain"], scale["range"]))
    return None


def _values(node: dict[str, Any], top: list[dict[str, Any]]) -> list[dict[str, Any]]:
    data = node.get("data")
    if isinstance(data, dict) and isinstance(data.get("values"), list):
        return data["values"]
    return top


def _as_num_time(v: Any) -> float:
    import matplotlib.dates as mdates

    if isinstance(v, (int, float)):
        return float(v)
    return mdates.date2num(datetime.fromisoformat(str(v).replace("Z", "+00:00")))


def _draw_line(ax: Any, rows: list[dict[str, Any]], enc: dict[str, Any]) -> bool:
    xf, yf = _field(enc, "x"), _field(enc, "y")
    kind, cmap = _color_lookup(enc.get("color"))
    color_field = _field(enc, "color")
    width_map = _scale_map(enc.get("strokeWidth"))
    op_map = _scale_map(enc.get("opacity"))
    groups: dict[Any, list[dict[str, Any]]] = {}
    for r in rows:
        groups.setdefault(r.get(color_field) if color_field else None, []).append(r)
    labelled = False
    for key, grp in groups.items():
        grp = sorted(grp, key=lambda r: r[xf])
        color = cmap.get(key) if isinstance(cmap, dict) else None
        lw = width_map.get(key) if width_map else None
        alpha = op_map.get(key) if op_map else None
        ax.plot(
            [r[xf] for r in grp],
            [r[yf] for r in grp],
            label=None if key is None else str(key),
            color=color,
            linewidth=lw,
            alpha=alpha,
        )
        labelled = labelled or key is not None
    return labelled


def _draw_point(ax: Any, rows: list[dict[str, Any]], enc: dict[str, Any], mark: dict[str, Any]) -> bool:
    xf, yf = _field(enc, "x"), _field(enc, "y")
    kind, cmap = _color_lookup(enc.get("color"))
    cf = _field(enc, "color")
    xs = [r[xf] for r in rows]
    ys = [r[yf] for r in rows]
    size = mark.get("size", 36)
    if kind == "quantitative" and cf:
        sc = ax.scatter(xs, ys, c=[r[cf] for r in rows], cmap=cmap, s=size)
        ax.figure.colorbar(sc, ax=ax)
    elif kind == "nominal" and isinstance(cmap, dict) and cf:
        ax.scatter(xs, ys, c=[cmap.get(r[cf]) for r in rows], s=size)
    elif kind == "literal" and cf:
        ax.scatter(xs, ys, c=[r[cf] for r in rows], s=size)
    else:
        ax.scatter(xs, ys, color=mark.get("color"), s=size)
    return False


def _draw_bar(ax: Any, rows: list[dict[str, Any]], enc: dict[str, Any]) -> bool:
    horizontal = _field(enc, "y") == "cat" or (enc.get("y", {}).get("field") == "cat")
    cat_enc = enc["y"] if horizontal else enc["x"]
    val_enc = enc["x"] if horizontal else enc["y"]
    cat_f, val_f = cat_enc["field"], val_enc["field"]
    _, cmap = _color_lookup(enc.get("color"))
    color_field = _field(enc, "color")
    stacked = bool(val_enc.get("stack"))
    grouped = "xOffset" in enc or "yOffset" in enc
    overlay = isinstance(enc.get("opacity"), dict) and "value" in enc["opacity"]

    cats = list(dict.fromkeys(r[cat_f] for r in rows))
    keys = list(dict.fromkeys(r[color_field] for r in rows)) if color_field else [None]
    cat_idx = {c: i for i, c in enumerate(cats)}
    import numpy as np

    pos = np.arange(len(cats), dtype=float)
    bottoms = np.zeros(len(cats))
    nkeys = max(1, len(keys))
    band = 0.8
    bar_w = band / nkeys if grouped else band
    for gi, key in enumerate(keys):
        vals = np.zeros(len(cats))
        for r in rows:
            if color_field and r[color_field] != key:
                continue
            vals[cat_idx[r[cat_f]]] = r[val_f]
        color = cmap.get(key) if isinstance(cmap, dict) else None
        label = None if key is None else str(key)
        if grouped:
            offs = pos - band / 2 + bar_w * (gi + 0.5)
        else:
            offs = pos
        if horizontal:
            ax.barh(offs, vals, height=bar_w, left=bottoms if stacked else None, color=color, label=label, alpha=0.65 if overlay else None)
        else:
            ax.bar(offs, vals, width=bar_w, bottom=bottoms if stacked else None, color=color, label=label, alpha=0.65 if overlay else None)
        if stacked:
            bottoms += vals
    if horizontal:
        ax.set_yticks(pos)
        ax.set_yticklabels([str(c) for c in cats])
    else:
        ax.set_xticks(pos)
        ax.set_xticklabels([str(c) for c in cats])
    return bool(color_field)


def _draw_gantt(ax: Any, rows: list[dict[str, Any]], enc: dict[str, Any]) -> bool:
    _, cmap = _color_lookup(enc.get("color"))
    color_field = _field(enc, "color")
    op_map = _scale_map(enc.get("opacity"))
    op_field = _field(enc, "opacity")
    y_sort = enc.get("y", {}).get("sort")
    labels = list(y_sort) if y_sort else list(dict.fromkeys(r["label"] for r in rows))
    ypos = {lbl: i for i, lbl in enumerate(labels)}
    seen: set[Any] = set()
    for r in rows:
        start, end = _as_num_time(r["start"]), _as_num_time(r["end"])
        color = cmap.get(r.get(color_field)) if isinstance(cmap, dict) else None
        alpha = op_map.get(r.get(op_field)) if op_map else None
        lbl = r.get(color_field)
        ax.barh(ypos[r["label"]], end - start, left=start, height=0.6, color=color, alpha=alpha, label=None if lbl in seen else str(lbl))
        seen.add(lbl)
    ax.set_yticks(range(len(labels)))
    ax.set_yticklabels(labels)
    is_time = rows and not isinstance(rows[0]["start"], (int, float))
    if is_time:
        import matplotlib.dates as mdates

        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
    return bool(color_field)


def _apply_axis_titles(ax: Any, enc: dict[str, Any]) -> None:
    x = enc.get("x", {})
    y = enc.get("y", {})
    xt = (x.get("axis") or {}).get("title") if isinstance(x, dict) else None
    yt = (y.get("axis") or {}).get("title") if isinstance(y, dict) else None
    if xt:
        ax.set_xlabel(xt)
    if yt:
        ax.set_ylabel(yt)


def _draw_layer(ax: Any, layer: dict[str, Any], top_rows: list[dict[str, Any]], top_enc: dict[str, Any]) -> bool:
    rows = _values(layer, top_rows)
    enc = {**top_enc, **(layer.get("encoding") or {})}
    mark = layer.get("mark")
    mtype = mark.get("type") if isinstance(mark, dict) else mark
    if not rows:
        return False
    if mtype == "line":
        return _draw_line(ax, rows, enc)
    if mtype == "point":
        return _draw_point(ax, rows, enc, mark if isinstance(mark, dict) else {})
    if mtype == "bar":
        # temporal x + x2 → gantt; otherwise a categorical bar chart.
        if "x2" in enc:
            return _draw_gantt(ax, rows, enc)
        return _draw_bar(ax, rows, enc)
    return False


def render(
    spec: dict[str, Any],
    *,
    preset: str = DEFAULT_PRESET,
    mode: Mode = "light",
    ax: Any = None,
    apply_style: bool = True,
):
    """Render a Vega-Lite spec to matplotlib. Returns ``(figure, axes)``.

    >>> spec = molplot.line_spec([{ "id": "a", "x": [0,1,2], "y": [1,3,2] }])
    >>> fig, ax = molplot.render(spec)
    """
    ctx = _style(preset, mode) if apply_style else nullcontext()
    with ctx:
        fig, ax = _ensure_ax(ax)
        top_rows = _values(spec, [])
        top_enc = spec.get("encoding") or {}
        any_legend = False
        if "layer" in spec:
            for layer in spec["layer"]:
                any_legend = _draw_layer(ax, layer, top_rows, top_enc) or any_legend
        else:
            any_legend = _draw_layer(ax, spec, top_rows, top_enc)
        _apply_axis_titles(ax, top_enc)
        # Show a legend only when the spec asked for one.
        color_enc = top_enc.get("color") if isinstance(top_enc.get("color"), dict) else None
        if not color_enc and "layer" in spec:
            for layer in spec["layer"]:
                ce = (layer.get("encoding") or {}).get("color")
                if isinstance(ce, dict):
                    color_enc = ce
                    break
        if any_legend and isinstance(color_enc, dict) and color_enc.get("legend") is not None:
            ax.legend()
    return fig, ax

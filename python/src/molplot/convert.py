"""Optional exact web-parity export via ``vl-convert``.

:func:`molplot.render.render` draws a spec with matplotlib (scienceplots). When
you instead want the *browser's* pixels — the real Vega engine rendering the
same intermediate spec — use these helpers. They require the optional
``vl-convert-python`` dependency (``pip install molcrafts-molplot[convert]``).
"""

from __future__ import annotations

from typing import Any

__all__ = ["to_png", "to_svg"]


def _require_vlc():
    try:
        import vl_convert as vlc
    except ImportError as exc:  # pragma: no cover - optional dep
        raise ImportError(
            "vl-convert-python is required for exact web-parity export; "
            "install with `pip install molcrafts-molplot[convert]`"
        ) from exc
    return vlc


def to_png(spec: dict[str, Any], path: str | None = None, *, scale: float = 2.0) -> bytes:
    """Render a Vega-Lite spec to PNG bytes via the real Vega engine."""
    vlc = _require_vlc()
    data = vlc.vegalite_to_png(spec, scale=scale)
    if path:
        with open(path, "wb") as fh:
            fh.write(data)
    return data


def to_svg(spec: dict[str, Any], path: str | None = None) -> str:
    """Render a Vega-Lite spec to an SVG string via the real Vega engine."""
    vlc = _require_vlc()
    svg = vlc.vegalite_to_svg(spec)
    if path:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(svg)
    return svg

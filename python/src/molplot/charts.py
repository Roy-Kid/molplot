"""High-level one-call charts: build a Vega-Lite spec (:mod:`molplot.specs`)
then render it to matplotlib (:mod:`molplot.render`). Each returns
``(figure, axes)``; pass ``ax=`` to compose into an existing figure. The
underlying spec is always available via the ``*_spec`` builders when you want
to ship it to the browser instead."""

from __future__ import annotations

from typing import Any, Sequence

from .preset import DEFAULT_PRESET, Mode
from .render import render
from .specs import bar_spec, gantt_spec, line_spec, scatter_spec

__all__ = ["line", "scatter", "bar", "gantt"]


def line(series: Sequence[dict[str, Any]], *, preset: str = DEFAULT_PRESET, mode: Mode = "light", ax: Any = None, **kwargs: Any):
    spec = line_spec(series, preset=preset, mode=mode, **kwargs)
    return render(spec, preset=preset, mode=mode, ax=ax)


def scatter(x: Sequence[float], y: Sequence[float], *, preset: str = DEFAULT_PRESET, mode: Mode = "light", ax: Any = None, **kwargs: Any):
    spec = scatter_spec(x, y, preset=preset, mode=mode, **kwargs)
    return render(spec, preset=preset, mode=mode, ax=ax)


def bar(categories: Sequence[Any], series: Sequence[dict[str, Any]], *, preset: str = DEFAULT_PRESET, mode: Mode = "light", ax: Any = None, **kwargs: Any):
    spec = bar_spec(categories, series, preset=preset, mode=mode, **kwargs)
    return render(spec, preset=preset, mode=mode, ax=ax)


def gantt(tasks: Sequence[dict[str, Any]], status_colors: dict[str, str], *, preset: str = DEFAULT_PRESET, mode: Mode = "light", ax: Any = None, **kwargs: Any):
    spec = gantt_spec(tasks, status_colors, preset=preset, mode=mode, **kwargs)
    return render(spec, preset=preset, mode=mode, ax=ax)

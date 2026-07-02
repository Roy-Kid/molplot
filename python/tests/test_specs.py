"""The Python spec builders must produce the same Vega-Lite shapes as the
TypeScript ones (core/src/specs.ts) — that structural equivalence is what makes
the spec a portable interchange format."""

import molplot


def test_line_spec_shape_and_config():
    spec = molplot.line_spec(
        [{"id": "a", "label": "A", "x": [0, 1], "y": [1, 2]}],
        show_legend=True,
    )
    assert spec["$schema"].endswith("vega-lite/v5.json")
    assert spec["data"]["values"][0] == {"s": "a", "key": "A", "i": 0, "x": 0, "y": 1}
    # Unified preset injected as the VL config.
    assert spec["config"]["range"]["category"][0] == "#1f77b4"
    color = spec["layer"][0]["encoding"]["color"]
    assert color["scale"]["domain"] == ["A"]
    assert color["legend"] == {"title": None}


def test_scatter_spec_numeric_colour_uses_scheme():
    spec = molplot.scatter_spec([0, 1], [0, 1], color=[1.0, 2.0], colorscale="magma", show_scale=True)
    color = spec["encoding"]["color"]
    assert color["type"] == "quantitative"
    assert color["scale"]["scheme"] == "magma"


def test_bar_spec_group_offset_and_stack():
    grouped = molplot.bar_spec(["a", "b"], [{"id": "s", "values": [1, 2]}], mode_="group")
    assert grouped["encoding"]["xOffset"] == {"field": "key"}
    assert grouped["encoding"]["y"]["stack"] is None
    stacked = molplot.bar_spec(["a"], [{"id": "s", "values": [1]}], mode_="stack")
    assert stacked["encoding"]["y"]["stack"] is True


def test_bar_spec_horizontal_flips_channels():
    spec = molplot.bar_spec(["a"], [{"id": "s", "values": [1]}], orientation="h")
    assert spec["encoding"]["y"]["field"] == "cat"
    assert spec["encoding"]["x"]["field"] == "val"


def test_gantt_spec_spans_and_status_colours():
    spec = molplot.gantt_spec(
        [{"id": "t", "label": "Build", "start": 0, "end": 10, "status": "ok"}],
        {"ok": "#22c55e"},
    )
    assert spec["encoding"]["x"]["field"] == "start"
    assert spec["encoding"]["x2"]["field"] == "end"
    assert spec["encoding"]["color"]["scale"]["range"] == ["#22c55e"]


def test_vega_config_matches_preset_palette():
    cfg = molplot.vega_config("molplot")
    assert cfg["range"]["category"][0] == "#1f77b4"
    assert cfg["axis"]["grid"] is True

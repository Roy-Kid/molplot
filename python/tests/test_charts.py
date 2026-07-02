import matplotlib.pyplot as plt

import molplot


def teardown_function():
    plt.close("all")


def test_line_one_call():
    fig, ax = molplot.line([{"id": "a", "x": [0, 1, 2], "y": [1, 2, 3]}], x_label="t", y_label="E")
    assert len(ax.lines) == 1
    assert ax.get_xlabel() == "t"


def test_scatter_one_call():
    fig, ax = molplot.scatter([0, 1], [0, 1])
    assert len(ax.collections) >= 1


def test_bar_one_call():
    fig, ax = molplot.bar(["a", "b"], [{"id": "s", "values": [1, 2]}])
    assert len(ax.patches) == 2


def test_gantt_one_call():
    fig, ax = molplot.gantt(
        [{"id": "t", "label": "Build", "start": 0, "end": 3, "status": "ok"}],
        {"ok": "#22c55e"},
    )
    assert len(ax.patches) == 1


def test_compose_into_existing_axes():
    fig, ax = plt.subplots()
    out_fig, out_ax = molplot.line([{"id": "a", "x": [0, 1], "y": [0, 1]}], ax=ax)
    assert out_ax is ax

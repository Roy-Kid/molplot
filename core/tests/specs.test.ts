import { describe, expect, it } from "@rstest/core";
import { barSpec, ganttSpec, lineSpec, scatterSpec } from "../src/specs";
import { resolveTheme } from "../src/theme";

// biome-ignore lint/suspicious/noExplicitAny: spec is intentionally loosely typed JSON
const S = (o: unknown) => o as any;

const light = resolveTheme("light");

describe("lineSpec", () => {
  it("carries the schema, preset config and named data", () => {
    const spec = S(
      lineSpec({ series: [{ id: "a", label: "A" }] }, light, { height: 200 }),
    );
    expect(spec.$schema).toContain("vega-lite/v5");
    expect(spec.data).toEqual({ name: "table" });
    expect(spec.height).toBe(200);
    // The unified preset is injected as the Vega-Lite config.
    expect(spec.config.range.category[0]).toBe(light.palette[0]);
    expect(spec.config.background).toBe("transparent");
  });

  it("maps each series to a colour-scale entry", () => {
    const spec = S(
      lineSpec(
        {
          series: [
            { id: "a", label: "A", color: "#111111" },
            { id: "b", label: "B" },
          ],
        },
        light,
      ),
    );
    const color = spec.layer[0].encoding.color;
    expect(color.scale.domain).toEqual(["A", "B"]);
    expect(color.scale.range[0]).toBe("#111111");
    // Legend hidden unless showLegend.
    expect(color.legend).toBeNull();
  });

  it("adds a marker layer only for lines+markers series", () => {
    const spec = S(
      lineSpec(
        { series: [{ id: "a", mode: "lines+markers" }, { id: "b" }] },
        light,
      ),
    );
    const markerLayer = spec.layer[1];
    expect(markerLayer.transform[0].filter.oneOf).toEqual(["a"]);
  });
});

describe("scatterSpec", () => {
  it("uses a sequential scheme for a numeric colour channel", () => {
    const spec = S(
      scatterSpec(
        {
          points: [{ x: 0, y: 0 }],
          xAxis: {},
          yAxis: {},
          marker: { color: [1, 2, 3], colorscale: "magma", showscale: true },
        },
        light,
      ),
    );
    const color = spec.layer[0].encoding.color;
    expect(color.type).toBe("quantitative");
    expect(color.scale.scheme).toBe("magma");
    expect(color.legend).toEqual({});
  });

  it("emits a highlight dataset layer", () => {
    const spec = S(scatterSpec({ points: [], xAxis: {}, yAxis: {} }, light));
    expect(spec.layer[1].data).toEqual({ name: "highlight" });
  });
});

describe("barSpec", () => {
  it("groups with an offset channel", () => {
    const spec = S(
      barSpec({ series: [{ id: "a", points: [] }], mode: "group" }, light),
    );
    expect(spec.layer[0].encoding.xOffset).toEqual({ field: "key" });
    expect(spec.layer[0].encoding.y.stack).toBeNull();
  });

  it("stacks by default value channel", () => {
    const spec = S(
      barSpec({ series: [{ id: "a", points: [] }], mode: "stack" }, light),
    );
    expect(spec.layer[0].encoding.y.stack).toBe(true);
    expect(spec.layer[0].encoding.xOffset).toBeUndefined();
  });

  it("flips channels when horizontal", () => {
    const spec = S(
      barSpec({ series: [{ id: "a", points: [] }], orientation: "h" }, light),
    );
    expect(spec.layer[0].encoding.y.field).toBe("cat");
    expect(spec.layer[0].encoding.x.field).toBe("val");
  });

  it("adds a line overlay layer for line series", () => {
    const spec = S(
      barSpec(
        {
          series: [
            { id: "a", points: [{ x: "x", y: 1 }] },
            { id: "b", type: "line", points: [{ x: "x", y: 3 }] },
          ],
          mode: "stack",
        },
        light,
      ),
    );
    expect(spec.layer.length).toBe(2);
    expect(spec.layer[1].data).toEqual({ name: "line" });
  });
});

describe("ganttSpec", () => {
  it("spans bars from start to end with status colouring", () => {
    const spec = S(
      ganttSpec(
        {
          tasks: [
            { id: "t1", label: "Build", start: 0, end: 10, statusGroup: "ok" },
          ],
          statusColors: { ok: "#22c55e" },
        },
        light,
      ),
    );
    expect(spec.encoding.x.field).toBe("start");
    expect(spec.encoding.x2.field).toBe("end");
    expect(spec.encoding.color.scale.range).toEqual(["#22c55e"]);
  });
});

import { describe, expect, it } from "@rstest/core";
import { chartFacts } from "../src/element_preview";

const bars = {
  data: {
    values: [
      { s: "b0", key: "bond_lengths_A[0]", cat: "0-1", val: 1.54 },
      { s: "b0", key: "bond_lengths_A[0]", cat: "1-2", val: 1.55 },
      { s: "b1", key: "bond_lengths_A[1]", cat: "0-1", val: 1.37 },
      { s: "b1", key: "bond_lengths_A[1]", cat: "1-2", val: 1.36 },
    ],
  },
  mark: { type: "bar" },
  encoding: {
    x: { field: "cat", type: "nominal", axis: { title: "junction" } },
    y: {
      field: "val",
      type: "quantitative",
      axis: { title: "bond length (Å)" },
    },
    color: { field: "key", type: "nominal", legend: { title: null } },
  },
};

describe("chartFacts", () => {
  it("names the figure and reads categories and series", () => {
    const facts = chartFacts(bars, "Junction bond lengths");
    expect(facts.title).toBe("Junction bond lengths");
    expect(facts.meta).toBe("2 categories · 2 series");
  });

  it("pivots bars into one row per category, one column per series", () => {
    expect(chartFacts(bars).table).toEqual({
      columns: ["junction", "bond_lengths_A[0]", "bond_lengths_A[1]"],
      numeric: [false, true, true],
      rows: [
        ["0-1", 1.54, 1.37],
        ["1-2", 1.55, 1.36],
      ],
    });
  });

  it("lists points for a continuous x and falls back to the spec title", () => {
    const facts = chartFacts({
      title: { text: "Energy" },
      data: {
        values: [
          { t: 0, e: 2 },
          { t: 1, e: 1 },
        ],
      },
      mark: "line",
      encoding: {
        x: { field: "t", type: "quantitative" },
        y: { field: "e", type: "quantitative", title: "E (eV)" },
      },
    });
    expect(facts.title).toBe("Energy");
    expect(facts.meta).toBe("2 points");
    expect(facts.table?.columns).toEqual(["t", "E (eV)"]);
  });

  it("offers no table when the data is not inline", () => {
    expect(
      chartFacts({ data: { name: "table" }, mark: "bar", encoding: {} }).table,
    ).toBeUndefined();
  });
});

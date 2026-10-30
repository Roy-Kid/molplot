import { describe, expect, it } from "@rstest/core";
import { nodeDpi } from "@/lib/scene";
import { dashForStyle, ptToPx, pxToPt, styleForDash } from "@/lib/units";
import { figure, legend } from "./fixtures";

describe("figure DPI and line styles", () => {
  it("uses the artist's figure DPI when it differs from rcParams", () => {
    const result = { ...figure(), figureDpi: { "figure/0": 300 } };
    const dpi = nodeDpi(result, legend.id);
    expect(dpi).toBe(300);
    expect(pxToPt(300 / 72, dpi)).toBe(1);
    expect(ptToPx(2, dpi)).toBeCloseTo(600 / 72);
  });
  it("keeps the default conversion for older hosts", () => {
    expect(nodeDpi(figure(), legend.id)).toBe(100);
    expect(pxToPt(ptToPx(1.4))).toBeCloseTo(1.4);
  });
  it("recognizes matplotlib dash patterns across DPI and line widths", () => {
    expect(styleForDash([1.4, 2.31])).toBe("dotted");
    expect(styleForDash([15.4, 6.7])).toBe("dashed");
    expect(styleForDash([6.4, 1.6, 1, 1.6])).toBe("dashdot");
    expect(styleForDash(dashForStyle("dotted", 300))).toBe("dotted");
  });
});

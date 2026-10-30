/** Matplotlib default canvas DPI. Scene stroke.width is stored in px. */
export const MPL_DPI = 100;

export function pxToPt(px: number, dpi = MPL_DPI): number {
  return (px * 72) / dpi;
}

export function ptToPx(pt: number, dpi = MPL_DPI): number {
  return (pt * dpi) / 72;
}

export const DASHED_PX = [6, 4];
export const DOTTED_PX = [1.5, 2.5];
export const DASHDOT_PX = [6, 3, 1.5, 3];

export type LineStyleId = "solid" | "dashed" | "dotted" | "dashdot";

export function dashForStyle(style: LineStyleId, dpi = MPL_DPI): number[] {
  const pattern =
    style === "dashed"
      ? DASHED_PX
      : style === "dotted"
        ? DOTTED_PX
        : style === "dashdot"
          ? DASHDOT_PX
          : [];
  return pattern.map((value) => (value * dpi) / MPL_DPI);
}

export function styleForDash(dash: readonly number[] | undefined): LineStyleId {
  if (!dash || dash.length === 0) return "solid";
  if (dash.length === 4) return "dashdot";
  if (dash.length === 2 && dash[0] <= dash[1]) return "dotted";
  return "dashed";
}

import { SELECTION } from "@/lib/selection";

/** SVG id for a Scene node. Must match Python `artist_gid`. */
export function artistGid(nodeId: string): string {
  return `molplot-${nodeId.replaceAll("/", "-")}`;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const PEN_ID = "molplot-pen";
const MAX_ANCHORS = 16;

export function findArtistPath(
  svg: SVGSVGElement,
  nodeId: string,
): SVGPathElement | null {
  const gid = artistGid(nodeId);
  const el = svg.querySelector(`#${CSS.escape(gid)}`);
  if (!el) return null;
  if (el instanceof SVGPathElement) return el;
  const path = [...el.querySelectorAll("path")].find(
    (item) => !item.closest("defs"),
  );
  return path instanceof SVGPathElement ? path : null;
}

/** Vertex list from matplotlib Line2D path data (`M x y L x y …`). */
export function pathVertices(d: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const token =
    /[ML]\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/gi;
  for (const match of d.matchAll(token)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

export function sampleAnchors(
  vertices: readonly { x: number; y: number }[],
  max = MAX_ANCHORS,
): { x: number; y: number }[] {
  if (vertices.length <= max) return [...vertices];
  const out: { x: number; y: number }[] = [];
  const last = vertices.length - 1;
  for (let i = 0; i < max; i += 1) {
    const index = i === max - 1 ? last : Math.round((i * last) / (max - 1));
    const point = vertices[index];
    if (point) out.push(point);
  }
  return out;
}

function clientToLocal(
  el: SVGGraphicsElement,
  clientX: number,
  clientY: number,
): DOMPoint | null {
  const svg = el.ownerSVGElement;
  const ctm = el.getScreenCTM();
  if (!svg || !ctm) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(ctm.inverse());
}

export function hitSvgSeries(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  nodeIds: readonly string[],
  slopPx = 10,
): string | null {
  for (let i = nodeIds.length - 1; i >= 0; i -= 1) {
    const nodeId = nodeIds[i];
    const path = findArtistPath(svg, nodeId);
    if (!path) continue;
    const ctm = path.getScreenCTM();
    const scale = ctm ? Math.hypot(ctm.a, ctm.b) || 1 : 1;
    const slop = (slopPx * 2) / scale;
    const probe = path.cloneNode(true) as SVGPathElement;
    // Matplotlib writes stroke-width in style, which overrides presentation
    // attributes. Clear it so the probe actually gets the requested hit slop.
    probe.removeAttribute("style");
    probe.setAttribute("fill", "none");
    probe.setAttribute("stroke", "#000");
    probe.setAttribute("stroke-width", String(slop));
    probe.setAttribute("stroke-linecap", "round");
    probe.setAttribute("stroke-linejoin", "round");
    probe.removeAttribute("clip-path");
    path.parentNode?.appendChild(probe);
    let hit = false;
    try {
      const local = clientToLocal(probe, clientX, clientY);
      hit = Boolean(local && probe.isPointInStroke(local));
    } finally {
      probe.remove();
    }
    if (hit) return nodeId;
  }
  return null;
}

export function clearPenSelection(svg: SVGSVGElement): void {
  svg.querySelector(`#${PEN_ID}`)?.remove();
}

const DATUM_ID = "molplot-datum";

export function clearDatumHighlight(svg: SVGSVGElement): void {
  svg.querySelector(`#${DATUM_ID}`)?.remove();
}

/** Mark a source data position; SVG vertices are a fallback for older hosts. */
export function paintDatumHighlight(
  svg: SVGSVGElement,
  path: SVGPathElement | null,
  index: number,
  position?: { x: number; y: number } | null,
): void {
  clearDatumHighlight(svg);
  if (position === null) return;
  const point = position
    ? {
        x: svg.viewBox.baseVal.x + position.x * svg.viewBox.baseVal.width,
        y: svg.viewBox.baseVal.y + position.y * svg.viewBox.baseVal.height,
      }
    : pathVertices(path?.getAttribute("d") ?? "")[index];
  if (!point) return;
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("id", DATUM_ID);
  group.setAttribute("pointer-events", "none");
  const clip = path?.getAttribute("clip-path");
  if (clip) group.setAttribute("clip-path", clip);
  group.appendChild(
    square(point.x, point.y, SELECTION.datum, SELECTION.accent, SELECTION.halo),
  );
  svg.append(group);
}

function square(
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string,
): SVGRectElement {
  const node = document.createElementNS(SVG_NS, "rect");
  node.setAttribute("x", String(x - size / 2));
  node.setAttribute("y", String(y - size / 2));
  node.setAttribute("width", String(size));
  node.setAttribute("height", String(size));
  node.setAttribute("fill", fill);
  node.setAttribute("stroke", stroke);
  node.setAttribute("stroke-width", "1.25");
  node.setAttribute("vector-effect", "non-scaling-stroke");
  return node;
}

/**
 * Hairline overlay along the path centreline. Ignores the original stroke
 * width so a thick series still gets a 1px pen. Drawn on top of the artist.
 */
export function paintPenSelection(
  _svg: SVGSVGElement,
  path: SVGPathElement,
): void {
  const root = path.ownerSVGElement;
  if (root) clearPenSelection(root);
  const d = path.getAttribute("d");
  const parent = path.parentNode;
  if (!d || !parent) return;
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("id", PEN_ID);
  group.setAttribute("pointer-events", "none");
  const clip = path.getAttribute("clip-path");
  if (clip) group.setAttribute("clip-path", clip);

  const hairline = (stroke: string, widthPx: number): SVGPathElement => {
    const node = document.createElementNS(SVG_NS, "path");
    node.setAttribute("d", d);
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", stroke);
    node.setAttribute("stroke-width", String(widthPx));
    node.setAttribute("stroke-linecap", "round");
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("vector-effect", "non-scaling-stroke");
    return node;
  };

  group.append(
    hairline(SELECTION.halo, SELECTION.haloWidth),
    hairline(SELECTION.accent, SELECTION.hairline),
  );
  for (const point of sampleAnchors(pathVertices(d))) {
    group.appendChild(
      square(
        point.x,
        point.y,
        SELECTION.vertex,
        SELECTION.halo,
        SELECTION.accent,
      ),
    );
  }
  parent.insertBefore(group, path.nextSibling);
}

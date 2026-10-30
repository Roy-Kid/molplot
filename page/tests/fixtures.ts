import type { Node } from "@molcrafts/molplot/semantic";
import type { HostResult } from "@/lib/host";

export const legend: Node = {
  id: "figure/0/legend",
  role: "legend",
  label: "Legend",
  children: [],
  components: { geometry: { bbox: { x: 0.2, y: 0.2, w: 0.3, h: 0.3 } } },
  editability: { geometry: { bbox: "editable" } },
};
export function figure(children: readonly Node[] = [legend]): HostResult {
  return {
    requestId: "test",
    revision: 1,
    script: "/tmp/figure.py",
    scene: {
      engineId: "matplotlib",
      root: {
        id: "figure/0",
        role: "figure",
        children,
        components: { geometry: { bbox: { x: 0, y: 0, w: 1, h: 1 } } },
        editability: {},
      },
    },
    view: {
      kind: "svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="720pt" height="360pt" viewBox="0 0 720 360"><g id="molplot-figure-0-legend"><rect x="144" y="72" width="216" height="108"/></g></svg>',
    },
    diagnostics: { traversal: [] },
    datasets: [
      {
        nodeId: "first",
        label: "First",
        columns: [
          { name: "x", values: [1, 1] },
          { name: "y", values: [2, 2] },
        ],
      },
      {
        nodeId: "second",
        label: "Second",
        columns: [
          { name: "x", values: [3] },
          { name: "y", values: [4] },
        ],
      },
    ],
  };
}

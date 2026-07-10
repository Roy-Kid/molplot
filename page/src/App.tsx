import {
  BarChart,
  GanttChart,
  LineChart,
  ScatterChart,
} from "@molcrafts/molplot";
import { useEffect, useRef, useState } from "react";

type Kind = "line" | "scatter" | "bar" | "gantt";
type Disposable = { dispose(): void };

/** Only continuous scales can be bound to the pan/zoom selection, so a chart
 * with a category (band) axis zooms along one axis only. */
const AXES_HINT: Record<Kind, string> = {
  line: "zooms x + y",
  scatter: "zooms x + y",
  bar: "zooms y — the category axis is a band scale",
  gantt: "zooms time — the task axis is a band scale",
};

function build(kind: Kind, el: HTMLElement, preset: string): Disposable {
  switch (kind) {
    case "line": {
      const xs = Array.from({ length: 60 }, (_, i) => i);
      return new LineChart(el, {
        preset,
        showLegend: true,
        xAxis: { label: "step" },
        yAxis: { label: "energy" },
        series: [
          {
            id: "total",
            label: "E total",
            initialPoints: xs.map((x) => ({ x, y: -10 + Math.sin(x / 6) })),
          },
          {
            id: "kin",
            label: "E kinetic",
            mode: "lines+markers",
            initialPoints: xs.map((x) => ({ x, y: 2 + Math.cos(x / 5) })),
          },
        ],
      });
    }
    case "scatter": {
      const pts = Array.from({ length: 200 }, (_, i) => ({
        x: Math.cos(i) * (1 + i / 200),
        y: Math.sin(i) * (1 + i / 200),
        customdata: i,
      }));
      return new ScatterChart(el, {
        preset,
        points: pts,
        xAxis: { label: "PC1" },
        yAxis: { label: "PC2" },
        marker: {
          color: pts.map((_, i) => i),
          colorscale: "viridis",
          showscale: true,
        },
      });
    }
    case "bar": {
      return new BarChart(el, {
        preset,
        mode: "stack",
        showLegend: true,
        xAxis: { label: "quarter" },
        yAxis: { label: "runs" },
        series: [
          {
            id: "ok",
            label: "succeeded",
            points: ["Q1", "Q2", "Q3", "Q4"].map((x, i) => ({ x, y: 8 + i })),
          },
          {
            id: "fail",
            label: "failed",
            points: ["Q1", "Q2", "Q3", "Q4"].map((x, i) => ({
              x,
              y: 3 - (i % 2),
            })),
          },
        ],
      });
    }
    case "gantt": {
      const t0 = Date.UTC(2026, 0, 1);
      const hr = 3600_000;
      return new GanttChart(el, {
        preset,
        statusColors: {
          done: "#22c55e",
          running: "#3b82f6",
          queued: "#a3a3a3",
        },
        statusOpacity: { queued: 0.5 },
        tasks: [
          {
            id: "a",
            label: "prep",
            start: t0,
            end: t0 + 4 * hr,
            statusGroup: "done",
          },
          {
            id: "b",
            label: "simulate",
            start: t0 + 4 * hr,
            end: t0 + 12 * hr,
            statusGroup: "running",
          },
          {
            id: "c",
            label: "analyze",
            start: t0 + 12 * hr,
            end: t0 + 16 * hr,
            statusGroup: "queued",
          },
        ],
      });
    }
  }
}

function ChartCard({ kind, preset }: { kind: Kind; preset: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = build(kind, el, preset);
    return () => chart.dispose();
  }, [kind, preset]);
  return (
    <div
      style={{
        border: "1px solid rgba(128,128,128,0.3)",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          margin: "0 0 8px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 13, textTransform: "capitalize" }}>
          {kind}
        </h3>
        <span style={{ opacity: 0.5, fontSize: 11 }}>{AXES_HINT[kind]}</span>
      </div>
      <div ref={ref} style={{ height: 260, width: "100%" }} />
    </div>
  );
}

export function App() {
  const [preset, setPreset] = useState("molplot");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.body.style.background = dark ? "#111113" : "#ffffff";
    document.body.style.color = dark ? "#e5e5e5" : "#111827";
  }, [dark]);

  return (
    <main
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        maxWidth: 1100,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>MolPlot Gallery</h1>
        <span style={{ opacity: 0.6, fontSize: 12 }}>
          Vega-Lite charts, unified preset — the same specs render to matplotlib
          in Python.
        </span>
        <span
          style={{
            flexBasis: "100%",
            opacity: 0.6,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          <b>wheel over an axis</b> to zoom that axis · <b>drag</b> to pan ·{" "}
          <b>shift + wheel</b> to zoom both · <b>double click</b> to reset. A
          wheel over the plot itself is left alone so the page still scrolls.
        </span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: 12 }}>
            preset&nbsp;
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              <option value="molplot">molplot</option>
              <option value="molplot-paper">molplot-paper</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => setDark(e.target.checked)}
            />{" "}
            dark
          </label>
        </div>
      </header>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        {(["line", "scatter", "bar", "gantt"] as Kind[]).map((k) => (
          <ChartCard key={k} kind={k} preset={preset} />
        ))}
      </section>
    </main>
  );
}

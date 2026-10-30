import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { WorkbenchShell } from "@/components/blocks/workbench-shell";
import type { DatumRef } from "@/components/workbench/DataPanel";
import { FigureCanvas } from "@/components/workbench/FigureCanvas";
import { Inspector } from "@/components/workbench/Inspector";
import { LeftRail, type LeftTab } from "@/components/workbench/LeftRail";
import { PlotToolbar } from "@/components/workbench/PlotToolbar";
import { useHostSession } from "@/hooks/useHostSession";
import { downloadExport, type ExportFormat } from "@/lib/host";
import { INLINE_PANEL_BREAKPOINT } from "@/lib/layout";
import { defaultSelection, findNode, scriptStem } from "@/lib/scene";
import { version } from "../../package.json";

export function App(): JSX.Element {
  const session = useHostSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("data");
  const [leftOpen, setLeftOpen] = useState(
    () =>
      typeof window === "undefined" ||
      window.innerWidth >= INLINE_PANEL_BREAKPOINT,
  );
  const [rightOpen, setRightOpen] = useState(
    () =>
      typeof window === "undefined" ||
      window.innerWidth >= INLINE_PANEL_BREAKPOINT,
  );
  const [grid, setGrid] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const [highlighted, setHighlighted] = useState<DatumRef | null>(null);
  const scene = session.result?.scene;
  const initializedSelection = useRef(false);

  useEffect(() => {
    if (!scene) return;
    if (!initializedSelection.current) {
      initializedSelection.current = true;
      setSelectedId(defaultSelection(scene.root));
      return;
    }
    setSelectedId((current) => {
      if (current === null || findNode(scene.root, current)) return current;
      return defaultSelection(scene.root);
    });
  }, [scene]);

  useEffect(() => {
    setHighlighted((current) => {
      if (!current) return current;
      const dataset = session.result?.datasets?.find(
        (item) => item.nodeId === current.nodeId,
      );
      return current.nodeId === selectedId &&
        dataset?.columns.some((column) => current.index < column.values.length)
        ? current
        : null;
    });
  }, [selectedId, session.result]);

  const onExport = (fmt: ExportFormat) => {
    if (!session.result) return;
    downloadExport(
      fmt,
      session.result.revision,
      scriptStem(session.result.script),
    );
  };

  return (
    <div className="h-full w-full">
      <WorkbenchShell
        product="MolPlot"
        version={`v${version}`}
        logo={
          <span
            aria-hidden
            className="flex size-6 items-center justify-center text-[24px] leading-none font-semibold text-accent"
          >
            ∿
          </span>
        }
        toolbar={
          <PlotToolbar
            disabled={
              !session.result ||
              session.status === "applying" ||
              session.status === "loading"
            }
            grid={grid}
            onToggleGrid={() => setGrid((value) => !value)}
            onFit={() => setFitToken((value) => value + 1)}
            onExport={onExport}
          />
        }
        left={
          <LeftRail
            tab={leftTab}
            onTabChange={setLeftTab}
            result={session.result}
            selectedId={selectedId}
            highlighted={highlighted}
            applying={session.status === "applying"}
            error={session.error}
            onSelect={setSelectedId}
            onHighlight={setHighlighted}
            onApplyStyle={session.applyStyle}
          />
        }
        right={
          <Inspector
            result={session.result}
            selectedId={selectedId}
            onApply={session.apply}
            onShowData={() => {
              setLeftTab("data");
              setLeftOpen(true);
            }}
          />
        }
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        status={
          session.error ? (
            <div
              role="alert"
              className="absolute inset-x-3 top-8 z-30 flex items-center gap-3 rounded-control border border-border bg-popover p-2 text-micro shadow-overlay"
            >
              <span className="min-w-0 flex-1 text-destructive">
                {session.error}
              </span>
              <button
                type="button"
                onClick={() => void session.reload()}
                className="shrink-0 text-accent"
              >
                Reload figure
              </button>
            </div>
          ) : null
        }
        onLeftOpenChange={setLeftOpen}
        onRightOpenChange={setRightOpen}
        canvas={
          <FigureCanvas
            result={session.result}
            selectedId={selectedId}
            highlighted={highlighted}
            grid={grid}
            fitToken={fitToken}
            onSelect={setSelectedId}
            onApply={session.apply}
            onMove={(nodeId, bbox) => {
              void session.apply({
                type: "set",
                nodeId,
                component: "geometry",
                property: "bbox",
                value: bbox,
              });
            }}
            status={session.status}
            error={session.error}
          />
        }
      />
    </div>
  );
}

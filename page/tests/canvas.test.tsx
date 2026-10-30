import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { act } from "react";
import { FigureCanvas } from "@/components/workbench/FigureCanvas";
import { mount } from "./dom";
import { figure, legend } from "./fixtures";

let view: ReturnType<typeof mount>;
beforeEach(() => {
  view = mount();
});
afterEach(async () => {
  await view.cleanup();
  rs.restoreAllMocks();
});

async function setup() {
  const onMove = rs.fn();
  const onSelect = rs.fn();
  await view.render(
    <FigureCanvas
      result={figure()}
      selectedId={legend.id}
      highlighted={null}
      grid={false}
      fitToken={0}
      onSelect={onSelect}
      onApply={async () => true}
      onMove={onMove}
      status="live"
      error={null}
    />,
  );
  const canvas = view.container.querySelector<HTMLElement>(
    '[role="application"]',
  )!;
  Object.assign(canvas, {
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
  });
  const svg = view.container.querySelector("svg")!;
  const host = svg.parentElement!;
  rs.spyOn(host, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 1000, 500),
  );
  Object.assign(svg, { getScreenCTM: () => null });
  return { canvas, onMove, onSelect };
}
async function pointer(
  el: Element,
  type: string,
  x = 300,
  y = 180,
  button = 0,
) {
  await act(async () => {
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        button,
        clientX: x,
        clientY: y,
      }),
    );
  });
}

describe("canvas pointer lifecycle", () => {
  it("does not mutate geometry for a click or a tiny pointer wobble", async () => {
    const { canvas, onMove } = await setup();
    await pointer(canvas, "pointerdown");
    await pointer(canvas, "pointermove", 301, 181);
    await pointer(canvas, "pointerup", 301, 181);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("restores preview geometry and does not submit a cancelled drag", async () => {
    const { canvas, onMove } = await setup();
    await pointer(canvas, "pointerdown");
    await pointer(canvas, "pointermove", 350, 200);
    const chrome = view.container.querySelector<HTMLElement>("[data-node]")!;
    expect(chrome.style.left).toBe("25%");
    await pointer(canvas, "pointercancel", 350, 200);
    expect(chrome.style.left).toBe("20%");
    await pointer(canvas, "pointerup", 350, 200);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("commits one completed drag with normalized coordinates", async () => {
    const { canvas, onMove } = await setup();
    await pointer(canvas, "pointerdown");
    await pointer(canvas, "pointermove", 350, 230);
    await pointer(canvas, "pointerup", 350, 230);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(legend.id, {
      x: 0.25,
      y: 0.2 + 0.1,
      w: 0.3,
      h: 0.3,
    });
  });

  it("blurs an inspector input before selecting a canvas element", async () => {
    const { canvas } = await setup();
    const field = document.createElement("input");
    document.body.append(field);
    const onBlur = rs.fn();
    field.addEventListener("blur", onBlur);
    field.focus();
    await pointer(canvas, "pointerdown");
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(canvas);
    field.remove();
  });

  it("ignores right clicks", async () => {
    const { canvas, onSelect } = await setup();
    await pointer(canvas, "pointerdown", 300, 180, 2);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("releases Space after the window loses focus", async () => {
    const { canvas, onSelect } = await setup();
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code: "Space", bubbles: true }),
      );
      window.dispatchEvent(new Event("blur"));
    });
    await pointer(canvas, "pointerdown");
    expect(onSelect).toHaveBeenCalledWith(legend.id);
  });
});

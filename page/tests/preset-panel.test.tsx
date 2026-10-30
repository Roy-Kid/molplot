import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { act } from "react";
import { PresetPanel } from "@/components/workbench/PresetPanel";
import type { CustomRc } from "@/lib/host";
import { mount } from "./dom";
import { figure } from "./fixtures";

let view: ReturnType<typeof mount>;
beforeEach(() => {
  view = mount();
});
afterEach(async () => view.cleanup());

describe("preset selection", () => {
  it("rolls back the selected source when applying a preset fails", async () => {
    const result = {
      ...figure(),
      style: {
        current: { source: "script", name: "script" },
        sources: [
          {
            id: "script",
            label: "Script",
            available: true,
            hint: null,
            styles: [],
          },
          {
            id: "matplotlib",
            label: "Matplotlib",
            available: true,
            hint: null,
            styles: [{ id: "ggplot", label: "ggplot" }],
          },
        ],
        rc: {} as CustomRc,
      },
    };
    const onApplyStyle = rs.fn(async () => false);
    await view.render(
      <PresetPanel
        result={result}
        applying={false}
        error={null}
        onApplyStyle={onApplyStyle}
      />,
    );
    const trigger = view.container.querySelector('[role="combobox"]')!;
    await act(async () => {
      trigger.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerType: "mouse",
        }),
      );
    });
    const option = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((el) => el.textContent === "Matplotlib")!;
    await act(async () => {
      option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onApplyStyle).toHaveBeenCalledWith({
      type: "style",
      source: "matplotlib",
      name: "ggplot",
      rc: undefined,
    });
    expect(trigger.textContent).toContain("Script");
  });
});

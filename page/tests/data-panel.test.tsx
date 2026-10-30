import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { act } from "react";
import { DataPanel } from "@/components/workbench/DataPanel";
import { mount } from "./dom";
import { figure } from "./fixtures";

let view: ReturnType<typeof mount>;
beforeEach(() => {
  view = mount();
});
afterEach(async () => view.cleanup());

describe("data panel selection", () => {
  it("follows scene selection after a dataset has been picked manually", async () => {
    const onSelect = rs.fn();
    const props = {
      result: figure(),
      selectedId: "first",
      highlighted: null,
      onSelect,
      onHighlight: rs.fn(),
    };
    await view.render(<DataPanel {...props} />);
    const trigger = view.container.querySelector('[role="combobox"]')!;
    await act(async () => {
      trigger.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          ctrlKey: false,
          pointerType: "mouse",
        }),
      );
    });
    const second = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((el) => el.textContent?.includes("Second"))!;
    await act(async () => {
      second.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledWith("second");
    await view.render(<DataPanel {...props} selectedId="second" />);
    expect(trigger.textContent).toContain("Second");
    await view.render(<DataPanel {...props} selectedId="first" />);
    expect(trigger.textContent).toContain("First");
  });

  it("renders duplicate points as separate addressable rows", async () => {
    const onHighlight = rs.fn();
    await view.render(
      <DataPanel
        result={figure()}
        selectedId="first"
        highlighted={null}
        onSelect={rs.fn()}
        onHighlight={onHighlight}
      />,
    );
    const rows = view.container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    await act(async () => (rows[1] as HTMLElement).click());
    expect(onHighlight).toHaveBeenCalledWith({ nodeId: "first", index: 1 });
  });
});

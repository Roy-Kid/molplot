import { afterEach, beforeEach, describe, expect, it } from "@rstest/core";
import { act, createRef } from "react";
import { WorkbenchSidePanel } from "@/components/blocks/workbench-side-panel";
import { mount } from "./dom";

let view: ReturnType<typeof mount>;
beforeEach(() => {
  view = mount();
});
afterEach(async () => view.cleanup());

describe("side panel presentation", () => {
  it("clears inline percent width when switching to a drawer", async () => {
    const panelRef = createRef<HTMLElement>();
    const props = {
      panelRef,
      drawer: false,
      inlineWidth: "18%",
      label: "Panel",
      open: true,
      side: "left" as const,
      children: <button type="button">Inside</button>,
    };
    await view.render(<WorkbenchSidePanel {...props} />);
    expect(panelRef.current?.style.width).toBe("18%");
    await view.render(<WorkbenchSidePanel {...props} drawer />);
    expect(panelRef.current?.style.width).toBe("");
    expect(panelRef.current?.getAttribute("aria-modal")).toBe("true");
    await view.render(<WorkbenchSidePanel {...props} />);
    expect(panelRef.current?.style.width).toBe("18%");
    expect(panelRef.current?.getAttribute("aria-modal")).toBeNull();
  });

  it("keeps Shift+Tab inside a newly focused drawer", async () => {
    const panelRef = createRef<HTMLElement>();
    await view.render(
      <WorkbenchSidePanel
        panelRef={panelRef}
        drawer
        inlineWidth="18%"
        label="Panel"
        open
        side="left"
      >
        <button type="button">First</button>
        <button type="button">Last</button>
      </WorkbenchSidePanel>,
    );
    const panel = panelRef.current!;
    for (const button of panel.querySelectorAll("button")) {
      Object.defineProperty(button, "offsetParent", { value: panel });
    }
    await act(async () => {
      panel.focus();
      panel.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(document.activeElement?.textContent).toBe("Last");
  });
});

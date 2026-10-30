import type { Node } from "@molcrafts/molplot/semantic";
import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { Inspector } from "@/components/workbench/Inspector";
import { blur, input, key, mount } from "./dom";
import { figure } from "./fixtures";

let view: ReturnType<typeof mount>;
beforeEach(() => {
  view = mount();
});
afterEach(async () => view.cleanup());
const title = (id: string): Node => ({
  id,
  role: "title",
  children: [],
  components: { text: { content: "Title" } },
  editability: { text: { content: "editable" } },
});

describe("inspector drafts", () => {
  it("does not carry an uncommitted text draft to another node with the same text", async () => {
    const onApply = rs.fn(async () => true);
    const props = {
      result: figure([title("a"), title("b")]),
      selectedId: "a",
      onApply,
      onShowData: rs.fn(),
    };
    await view.render(<Inspector {...props} />);
    await input(view.container.querySelector("input")!, "Draft for a");
    await view.render(<Inspector {...props} selectedId="b" />);
    const field = view.container.querySelector("input")!;
    expect(field.value).toBe("Title");
    await blur(field);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("commits text once on Enter and blur", async () => {
    const onApply = rs.fn(async () => true);
    await view.render(
      <Inspector
        result={figure([title("a")])}
        selectedId="a"
        onApply={onApply}
        onShowData={rs.fn()}
      />,
    );
    const field = view.container.querySelector("input")!;
    await input(field, "New title");
    await key(field, "Enter");
    await blur(field);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      type: "set",
      nodeId: "a",
      component: "text",
      property: "content",
      value: "New title",
    });
  });

  it("restores text after the host rejects it", async () => {
    await view.render(
      <Inspector
        result={figure([title("a")])}
        selectedId="a"
        onApply={async () => false}
        onShowData={rs.fn()}
      />,
    );
    const field = view.container.querySelector("input")!;
    await input(field, "Rejected");
    await blur(field);
    expect(field.value).toBe("Title");
  });

  it("keeps full tick precision and ignores untouched or invalid tick lists", async () => {
    const axis: Node = {
      id: "axis",
      role: "axis",
      children: [],
      components: { axis: { ticks: [0.123456, 0.234567] } },
      editability: { axis: { ticks: "editable" } },
    };
    const onApply = rs.fn(async () => true);
    await view.render(
      <Inspector
        result={figure([axis])}
        selectedId="axis"
        onApply={onApply}
        onShowData={rs.fn()}
      />,
    );
    const field =
      view.container.querySelector<HTMLInputElement>("#axis-ticks")!;
    expect(field.value).toBe("0.123456, 0.234567");
    await blur(field);
    expect(onApply).not.toHaveBeenCalled();
    await input(field, "1, nope");
    await blur(field);
    expect(onApply).not.toHaveBeenCalled();
    expect(field.value).toBe("0.123456, 0.234567");
    await input(field, "0.123456, 0.987654");
    await key(field, "Enter");
    expect(onApply).toHaveBeenCalledWith({
      type: "set",
      nodeId: "axis",
      component: "axis",
      property: "ticks",
      value: [0.123456, 0.987654],
    });
  });
});

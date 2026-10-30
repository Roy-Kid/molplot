import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { NumberField } from "@/components/ui/number-field";
import { formatScience } from "@/lib/format";
import { blur, input, key, mount } from "./dom";

let view: ReturnType<typeof mount>;
beforeEach(() => {
  view = mount();
});
afterEach(async () => view.cleanup());

async function field(props = {}) {
  const onChange = rs.fn();
  await view.render(
    <NumberField
      value={1.23456}
      format={formatScience}
      step={0.1}
      onChange={onChange}
      {...props}
    />,
  );
  return { element: view.container.querySelector("input")!, onChange };
}

describe("NumberField editing", () => {
  it("does not submit or round an untouched displayed value on blur", async () => {
    const { element, onChange } = await field();
    expect(element.value).toBe("1.23");
    await blur(element);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("preserves scientific values smaller than the spinner step", async () => {
    const { element, onChange } = await field();
    await input(element, "0.00123456");
    await blur(element);
    expect(onChange).toHaveBeenCalledWith(0.00123456);
  });

  it("commits Enter followed by blur only once", async () => {
    const { element, onChange } = await field();
    await input(element, "2");
    await key(element, "Enter");
    await blur(element);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it.each([
    "",
    " ",
    "Infinity",
    "1e999",
    "nope",
  ])("rejects invalid input %s", async (value) => {
    const { element, onChange } = await field();
    await input(element, value);
    await blur(element);
    expect(onChange).not.toHaveBeenCalled();
    expect(element.value).toBe("1.23");
  });

  it("cancels a draft on Escape", async () => {
    const { element, onChange } = await field();
    await input(element, "20");
    await key(element, "Escape");
    await blur(element);
    expect(onChange).not.toHaveBeenCalled();
    expect(element.value).toBe("1.23");
  });

  it("clamps to bounds without rounding outside them", async () => {
    const { element, onChange } = await field({ min: 0.15, max: 0.95 });
    await input(element, "5");
    await blur(element);
    expect(onChange).toHaveBeenCalledWith(0.95);
  });

  it("restores the server value after a rejected edit", async () => {
    const onChange = rs.fn(async () => false);
    const { element } = await field({ onChange });
    await input(element, "10");
    await blur(element);
    expect(element.value).toBe("1.23");
  });
});

describe("NumberField in-flight edits", () => {
  it("preserves a draft while an earlier server response changes the value", async () => {
    const onChange = rs.fn();
    await view.render(<NumberField value={1} onChange={onChange} />);
    const element = view.container.querySelector("input")!;
    await input(element, "3");
    await view.render(<NumberField value={2} onChange={onChange} />);
    expect(element.value).toBe("3");
    await blur(element);
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

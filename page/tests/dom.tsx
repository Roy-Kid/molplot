import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

// React uses this flag to report updates outside act().
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export function mount() {
  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);
  return {
    container,
    render: async (node: ReactNode) => {
      await act(async () => root.render(node));
    },
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export async function input(element: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export async function key(element: Element, value: string) {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: value, bubbles: true }),
    );
  });
}

export async function blur(element: Element) {
  await act(async () => {
    element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
}

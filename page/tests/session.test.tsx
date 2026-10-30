import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { act, StrictMode } from "react";
import { type HostSession, useHostSession } from "@/hooks/useHostSession";
import {
  fetchResult,
  type HostResult,
  postCommand,
  postStyle,
} from "@/lib/host";
import { mount } from "./dom";

rs.mock("@/lib/host", () => ({
  fetchResult: rs.fn(),
  postCommand: rs.fn(),
  postStyle: rs.fn(),
}));

let view: ReturnType<typeof mount>;
let session: HostSession;
const command = {
  type: "set",
  nodeId: "figure/0",
  component: "layout",
  property: "width",
  value: 5,
} as const;
const style = { type: "style", source: "custom", name: "custom" } as const;
const result = (revision: number): HostResult => ({
  requestId: "test",
  revision,
  script: "/tmp/figure.py",
  scene: {
    engineId: "matplotlib",
    root: {
      id: "figure/0",
      role: "figure",
      children: [],
      components: {},
      editability: {},
    },
  },
  view: { kind: "svg", svg: "<svg/>" },
  diagnostics: { traversal: [] },
});
function Harness() {
  session = useHostSession();
  return null;
}

beforeEach(() => {
  rs.resetAllMocks();
  rs.mocked(fetchResult).mockResolvedValue(result(1));
  view = mount();
});
afterEach(async () => view.cleanup());

describe("host session request ordering", () => {
  it("uses the preceding response revision for rapid edits, before a render", async () => {
    await view.render(<Harness />);
    const revisions: number[] = [];
    rs.mocked(postCommand).mockImplementation(async (command) => {
      revisions.push(command.baseRevision);
      return {
        ok: true,
        requestId: "test",
        result: result(command.baseRevision + 1),
      };
    });
    await act(async () => {
      expect(
        await Promise.all([
          session.apply(command),
          session.apply(command),
          session.apply(command),
        ]),
      ).toEqual([true, true, true]);
    });
    expect(revisions).toEqual([1, 2, 3]);
    expect(session.result?.revision).toBe(4);
  });

  it("serializes style changes, reloads, and ordinary edits together", async () => {
    await view.render(<Harness />);
    const order: string[] = [];
    rs.mocked(postStyle).mockImplementation(async () => {
      order.push("style");
      return { ok: true, requestId: "style", result: result(0) };
    });
    rs.mocked(fetchResult).mockImplementation(async () => {
      order.push("reload");
      return result(0);
    });
    rs.mocked(postCommand).mockImplementation(async (command) => {
      order.push(`edit:${command.baseRevision}`);
      return { ok: true, requestId: "edit", result: result(1) };
    });
    await act(async () => {
      await Promise.all([
        session.applyStyle(style),
        session.reload(),
        session.apply(command),
      ]);
    });
    expect(order).toEqual(["style", "reload", "edit:0"]);
    expect(session.result?.revision).toBe(1);
  });

  it("recovers the queue after a failed edit", async () => {
    await view.render(<Harness />);
    rs.mocked(postCommand).mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      expect(await session.apply(command)).toBe(false);
    });
    expect(session.error).toBe("offline");
    expect(session.status).toBe("error");
    expect(session.result?.revision).toBe(1);
    rs.mocked(postCommand).mockResolvedValue({
      ok: true,
      requestId: "ok",
      result: result(2),
    });
    await act(async () => {
      expect(await session.apply(command)).toBe(true);
    });
    expect(session.error).toBeNull();
    expect(session.status).toBe("live");
  });

  it("refreshes stale state so the next edit can succeed", async () => {
    await view.render(<Harness />);
    rs.mocked(postCommand).mockResolvedValueOnce({
      ok: false,
      requestId: "stale",
      error: { code: "stale_revision", message: "Changed elsewhere" },
    });
    rs.mocked(fetchResult).mockResolvedValue(result(9));
    await act(async () => {
      expect(await session.apply(command)).toBe(false);
    });
    expect(session.result?.revision).toBe(9);
    rs.mocked(postCommand).mockResolvedValue({
      ok: true,
      requestId: "ok",
      result: result(10),
    });
    await act(async () => {
      await session.apply(command);
    });
    expect(rs.mocked(postCommand).mock.calls.at(-1)?.[0].baseRevision).toBe(9);
  });

  it("preserves script metadata after style replies omit it", async () => {
    await view.render(<Harness />);
    const next = { ...result(0), script: undefined };
    rs.mocked(postStyle).mockResolvedValue({
      ok: true,
      requestId: "style",
      result: next,
    });
    await act(async () => {
      await session.applyStyle(style);
    });
    expect(session.result?.script).toBe("/tmp/figure.py");
  });

  it("loads and edits successfully in React StrictMode", async () => {
    await view.render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    expect(session.status).toBe("live");
    rs.mocked(postCommand).mockResolvedValue({
      ok: true,
      requestId: "ok",
      result: result(2),
    });
    await act(async () => {
      expect(await session.apply(command)).toBe(true);
    });
    expect(session.result?.revision).toBe(2);
  });
});

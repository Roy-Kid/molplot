import type { Command } from "@molcrafts/molplot/semantic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchResult,
  type HostResult,
  postCommand,
  postStyle,
  type StyleCommand,
} from "@/lib/host";

export type HostStatus = "loading" | "live" | "applying" | "error";

export interface HostSession {
  status: HostStatus;
  error: string | null;
  result: HostResult | null;
  reload: () => Promise<void>;
  apply: (command: Omit<Command, "baseRevision">) => Promise<boolean>;
  applyStyle: (command: StyleCommand) => Promise<boolean>;
}

export function useHostSession(): HostSession {
  const [status, setStatus] = useState<HostStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HostResult | null>(null);
  const latest = useRef<HostResult | null>(null);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(false);
  const seq = useRef(0);

  const publish = useCallback((next: HostResult) => {
    latest.current = next;
    if (mounted.current) setResult(next);
  }, []);

  // Reads and writes share one queue. Take the revision when a command starts,
  // after the preceding response updates latest, even before React renders.
  const enqueue = useCallback(
    (working: HostStatus, operation: () => Promise<boolean>) => {
      const task = queue.current.then(async () => {
        if (!mounted.current) return false;
        setStatus(working);
        setError(null);
        try {
          const ok = await operation();
          if (mounted.current) setStatus("live");
          return ok;
        } catch (err) {
          if (mounted.current) {
            setStatus("error");
            setError(err instanceof Error ? err.message : String(err));
          }
          return false;
        }
      });
      queue.current = task.then(() => {});
      return task;
    },
    [],
  );

  const reload = useCallback(async () => {
    await enqueue("loading", async () => {
      publish(await fetchResult("result"));
      return true;
    });
  }, [enqueue, publish]);

  const apply = useCallback(
    (command: Omit<Command, "baseRevision">) =>
      enqueue("applying", async () => {
        const previous = latest.current;
        if (!previous) throw new Error("No figure loaded.");
        const payload = await postCommand(
          { ...command, baseRevision: previous.revision },
          `ui-${++seq.current}`,
        );
        if (!payload.ok || !payload.result) {
          if (payload.error?.code === "stale_revision") {
            publish(await fetchResult("result"));
            throw new Error(
              "The figure changed elsewhere. The latest version is loaded; try the edit again.",
            );
          }
          throw new Error(
            payload.error?.message || payload.error?.code || "Apply failed",
          );
        }
        publish({
          ...payload.result,
          script: payload.result.script ?? payload.script ?? previous.script,
        });
        return true;
      }),
    [enqueue, publish],
  );

  const applyStyle = useCallback(
    (command: StyleCommand) =>
      enqueue("applying", async () => {
        const previous = latest.current;
        const payload = await postStyle(command, `ui-${++seq.current}`);
        if (!payload.ok || !payload.result) {
          throw new Error(
            payload.error?.message || payload.error?.code || "Style failed",
          );
        }
        publish({
          ...payload.result,
          script: payload.result.script ?? payload.script ?? previous?.script,
        });
        return true;
      }),
    [enqueue, publish],
  );

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);

  return { status, error, result, reload, apply, applyStyle };
}

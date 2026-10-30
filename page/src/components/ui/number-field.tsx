import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumberFieldProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    | "type"
    | "value"
    | "min"
    | "max"
    | "step"
    | "onChange"
    | "onBlur"
    | "onKeyDown"
  > {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Display transform. Size fields use two decimals; science fields use e-notation. */
  format?: (value: number) => string;
  onChange: (value: number) => unknown;
}

/**
 * Numeric input that holds a string draft while editing and commits a
 * finite, clamped value on blur or Enter. Shared by the View-tab
 * render controls and the Data Source per-component parameters.
 */
export function NumberField({
  value,
  min,
  max,
  step,
  format,
  onChange,
  className,
  ...inputProps
}: NumberFieldProps) {
  const shown = format ? format(value) : String(value);
  const [draft, setDraft] = useState(shown);
  const dirty = useRef(false);
  const generation = useRef(0);
  const latest = useRef(shown);
  latest.current = shown;
  useEffect(() => {
    if (!dirty.current) setDraft(shown);
  }, [shown]);

  const commit = () => {
    if (!dirty.current) return;
    dirty.current = false;
    let v = Number(draft);
    if (!draft.trim() || !Number.isFinite(v)) {
      setDraft(shown);
      return;
    }
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    // step controls the spinner; rounding typed scientific values to the step
    // silently changed small axis limits (e.g. 0.001 became 0).
    setDraft(format ? format(v) : String(v));
    if (v !== value) {
      const current = generation.current;
      void Promise.resolve(onChange(v)).then((ok) => {
        if (ok === false && current === generation.current)
          setDraft(latest.current);
      });
    }
  };

  return (
    <Input
      {...inputProps}
      type={format ? "text" : "number"}
      inputMode="decimal"
      className={cn(
        "h-control-compact w-16 shrink-0 px-2 text-label tabular-nums",
        className,
      )}
      value={draft}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        generation.current += 1;
        dirty.current = true;
        setDraft(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          generation.current += 1;
          dirty.current = false;
          setDraft(shown);
        }
      }}
    />
  );
}

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface CommitInputProps
  extends Omit<
    ComponentProps<typeof Input>,
    "value" | "defaultValue" | "onChange" | "onBlur" | "onKeyDown"
  > {
  value: string;
  onCommit: (value: string) => Promise<boolean>;
}

/** Text draft with one commit per edit and rollback after a rejected command. */
export function CommitInput({ value, onCommit, ...props }: CommitInputProps) {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  const generation = useRef(0);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (!dirty.current) setDraft(value);
  }, [value]);

  const commit = async () => {
    if (!dirty.current) return;
    dirty.current = false;
    if (draft === value) return;
    const current = generation.current;
    const ok = await onCommit(draft);
    if (!ok && current === generation.current) setDraft(latest.current);
  };

  return (
    <Input
      {...props}
      value={draft}
      onChange={(event) => {
        generation.current += 1;
        dirty.current = true;
        setDraft(event.target.value);
      }}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          void commit();
        } else if (event.key === "Escape") {
          generation.current += 1;
          dirty.current = false;
          setDraft(value);
        }
      }}
    />
  );
}

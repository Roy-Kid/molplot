/**
 * What the `<molplot-chart>` preview header reads from a spec: the figure's
 * title, a one-line reading, and the data as a table. Pure functions over
 * the Vega-Lite spec, so the header and the table say what the chart draws.
 */
import { channelTitle } from "./raw_chart";
import type { VegaLiteSpec } from "./specs";

type Encoding = Record<
  string,
  | {
      field?: string;
      type?: string;
      title?: unknown;
      axis?: { title?: unknown } | null;
      legend?: { title?: unknown } | null;
    }
  | undefined
>;

export interface ChartTable {
  columns: string[];
  /** Quantitative columns, right-aligned with tabular numerals. */
  numeric: boolean[];
  rows: (string | number | null)[][];
}

export interface ChartFacts {
  title?: string;
  meta?: string;
  table?: ChartTable;
}

function specTitle(spec: VegaLiteSpec): string | undefined {
  const title = spec.title as unknown;
  if (typeof title === "string" && title.trim() !== "") return title;
  if (title && typeof title === "object") {
    const text = (title as { text?: unknown }).text;
    if (typeof text === "string" && text.trim() !== "") return text;
    if (Array.isArray(text)) return text.join(" ");
  }
  return undefined;
}

function inlineRows(spec: VegaLiteSpec): Record<string, unknown>[] | undefined {
  const values = (spec.data as { values?: unknown } | undefined)?.values;
  return Array.isArray(values)
    ? (values as Record<string, unknown>[])
    : undefined;
}

function cell(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Title, reading and table for a unit spec with inline data. */
export function chartFacts(spec: VegaLiteSpec, label?: string): ChartFacts {
  const title = label?.trim() || specTitle(spec);
  const encoding = spec.encoding as Encoding | undefined;
  const rows = inlineRows(spec);
  if (!encoding || !rows) return { title };

  const x = encoding.x;
  const y = encoding.y;
  const color = encoding.color;
  const series = color?.field
    ? Array.from(new Set(rows.map((row) => row[color.field as string])))
    : [];
  const discreteX = x?.field && (x.type === "nominal" || x.type === "ordinal");
  const categories = discreteX
    ? Array.from(new Set(rows.map((row) => row[x.field as string])))
    : [];

  const reading = [
    discreteX
      ? plural(categories.length, "category", "categories")
      : plural(rows.length, "point", "points"),
    ...(series.length > 1 ? [`${series.length} series`] : []),
  ].join(" · ");

  let table: ChartTable | undefined;
  if (discreteX && y?.field && color?.field && series.length > 0) {
    // One row per category, one column per series: how a reader compares bars.
    const value = (category: unknown, key: unknown) =>
      cell(
        rows.find(
          (row) =>
            row[x.field as string] === category &&
            row[color.field as string] === key,
        )?.[y.field as string],
      );
    table = {
      columns: [
        channelTitle(x, x.field as string),
        ...series.map((key) => String(key)),
      ],
      numeric: [false, ...series.map(() => y.type === "quantitative")],
      rows: categories.map((category) => [
        cell(category),
        ...series.map((key) => value(category, key)),
      ]),
    };
  } else {
    const defs = (["x", "y", "color"] as const)
      .map((channel) => ({ channel, def: encoding[channel] }))
      .filter(
        (
          item,
        ): item is {
          channel: "x" | "y" | "color";
          def: NonNullable<Encoding[string]>;
        } => Boolean(item.def?.field),
      );
    if (defs.length > 0) {
      table = {
        columns: defs.map(({ channel, def }) =>
          channelTitle(
            def,
            channel === "color" ? "series" : (def.field as string),
          ),
        ),
        numeric: defs.map(({ def }) => def.type === "quantitative"),
        rows: rows.map((row) =>
          defs.map(({ def }) => cell(row[def.field as string])),
        ),
      };
    }
  }
  return { title, meta: reading, table };
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return value.toExponential(4);
  return Number(value.toPrecision(6)).toString();
}

/** Fill `host` with a read-only table of the chart's data. */
export function renderDataTable(
  host: HTMLElement,
  table: ChartTable,
  caption: string,
): void {
  const doc = host.ownerDocument;
  const element = doc.createElement("table");
  const head = doc.createElement("caption");
  head.textContent = caption;
  const thead = doc.createElement("thead");
  const headRow = doc.createElement("tr");
  table.columns.forEach((column, index) => {
    const th = doc.createElement("th");
    th.scope = "col";
    th.textContent = column;
    if (table.numeric[index]) th.dataset.numeric = "";
    headRow.append(th);
  });
  thead.append(headRow);
  const tbody = doc.createElement("tbody");
  for (const row of table.rows) {
    const tr = doc.createElement("tr");
    row.forEach((value, index) => {
      const td = doc.createElement(index === 0 ? "th" : "td");
      if (index === 0) (td as HTMLTableCellElement).scope = "row";
      td.textContent =
        value === null
          ? "—"
          : typeof value === "number"
            ? formatNumber(value)
            : value;
      if (table.numeric[index]) td.dataset.numeric = "";
      tr.append(td);
    });
    tbody.append(tr);
  }
  element.append(head, thead, tbody);
  host.replaceChildren(element);
}

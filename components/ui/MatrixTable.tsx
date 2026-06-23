"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const MIN_COL_WIDTH = 72;
const SELECT_COL_WIDTH = 44;
// Preferred base widths used to size columns and to compute the table's
// minimum width. When the sum exceeds the viewport the scroll container shows
// a horizontal scrollbar instead of squeezing every column to fit.
const FIRST_COL_WIDTH = 200;
const DEFAULT_COL_WIDTH = 120;

export type SortDir = "asc" | "desc";

/**
 * One column of a {@link MatrixTable}. `cell` renders the body cell; provide
 * `sortValue` to make the column sortable (a number sorts numerically, a string
 * alphabetically). The first column in the list is rendered as the sticky
 * left-hand row label.
 */
export type MatrixColumn<R> = {
  /** Stable identity for the column (used for keys and sort state). */
  key: string;
  /** Header label. */
  header: ReactNode;
  /** Text alignment for header + cells. Defaults to "left" for the first
   *  column and "center" for the rest. */
  align?: "left" | "center" | "right";
  /** Return a sortable value for a row; omit to make the column non-sortable. */
  sortValue?: (row: R) => number | string;
  /** Initial column width in px, before any manual resize. Falls back to the
   *  first-column / default base width when omitted. */
  width?: number;
  /** Cap the column at its width and truncate overflow with an ellipsis even
   *  before any manual resize (otherwise wide content grows the column). */
  clip?: boolean;
  /** Render the body cell for a row. */
  cell: (row: R) => ReactNode;
};

type Align = "left" | "center" | "right";

const TEXT_ALIGN: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
const JUSTIFY: Record<Align, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Generic, reusable matrix/grid table with a sticky distinct-colored header, a
 * sticky first column, and click-to-sort on any column that supplies a
 * `sortValue`. Rows flagged by `pinned` stay at the top regardless of sort
 * (e.g. a baseline row). Sort state lives inside the component.
 *
 * Drop-in for any "labels down the left, categories across the top" grid —
 * the coverage matrix is one consumer, but it carries no domain logic.
 */
export function MatrixTable<R>({
  rows,
  columns,
  rowKey,
  pinned,
  onRowClick,
  defaultSort,
  emptyMessage,
  caption,
  maxHeight = "60vh",
  className,
  selectedKeys,
  onToggleRow,
  onToggleAll,
}: {
  rows: R[];
  columns: MatrixColumn<R>[];
  rowKey: (row: R) => string;
  /** Rows for which this returns true are kept pinned on top, unsorted. */
  pinned?: (row: R) => boolean;
  /** Makes rows clickable (cursor + hover); called with the clicked row. */
  onRowClick?: (row: R) => void;
  /** When provided, a leading checkbox column is shown; the set holds the
   *  `rowKey` of every selected row. */
  selectedKeys?: Set<string>;
  /** Called with a row when its checkbox is toggled. */
  onToggleRow?: (row: R) => void;
  /** Called with the currently visible (sorted) rows when the header checkbox
   *  is toggled. When all are selected it should clear them, otherwise select
   *  them all. */
  onToggleAll?: (rows: R[]) => void;
  /** Initial sort applied on mount. */
  defaultSort?: { key: string; dir?: SortDir };
  /** Rendered (spanning all columns) when `rows` is empty. */
  emptyMessage?: ReactNode;
  /** Optional footnote rendered under the table. */
  caption?: ReactNode;
  /** Max height of the scroll viewport (CSS value). Defaults to "60vh". */
  maxHeight?: string;
  className?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort?.dir ?? "asc");

  // Per-column widths in px. Empty until the user first drags a divider, at
  // which point every column is frozen at its current (equal) width so only the
  // dragged edge moves. Until then columns share width equally via table-fixed.
  const [widths, setWidths] = useState<Record<string, number>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  const firstSortable = columns.find((c) => c.sortValue);
  const selectable = selectedKeys !== undefined;
  // The leading checkbox th shifts every data column one slot to the right in
  // the rendered header, so index-based lookups add this offset.
  const selOffset = selectable ? 1 : 0;

  function startResize(e: React.MouseEvent, key: string) {
    e.preventDefault();
    e.stopPropagation();
    const headCells = tableRef.current?.querySelectorAll("thead th");
    if (!headCells) return;

    // Freeze all columns at their current rendered widths, then drag one edge.
    const frozen: Record<string, number> = {};
    columns.forEach((c, i) => {
      frozen[c.key] = (headCells[i + selOffset] as HTMLElement).offsetWidth;
    });
    const startX = e.clientX;
    const startWidth = frozen[key];
    setWidths(frozen);

    const onMove = (ev: MouseEvent) => {
      const next = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
      setWidths((w) => ({ ...w, [key]: next }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRows = useMemo(() => {
    const col = sortKey ? columns.find((c) => c.key === sortKey) : null;
    if (!col?.sortValue) return rows;
    const sortValue = col.sortValue;
    const tiebreak = firstSortable?.sortValue;

    const top = pinned ? rows.filter(pinned) : [];
    const rest = pinned ? rows.filter((r) => !pinned(r)) : [...rows];
    rest.sort((a, b) => {
      let cmp = compareValues(sortValue(a), sortValue(b));
      if (cmp === 0 && tiebreak && tiebreak !== sortValue) {
        cmp = compareValues(tiebreak(a), tiebreak(b));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return [...top, ...rest];
  }, [rows, columns, sortKey, sortDir, pinned, firstSortable]);

  // Base width for a column when the user hasn't dragged it: an explicit
  // per-column `width` wins, else the row-label column is wider and data
  // columns share a common floor.
  const baseColWidth = (col: MatrixColumn<R>, i: number) =>
    col.width ?? (i === 0 ? FIRST_COL_WIDTH : DEFAULT_COL_WIDTH);

  // Minimum table width = sum of every column's (dragged or base) width plus the
  // optional checkbox column. Drives the horizontal scroll when it overflows.
  const tableMinWidth = useMemo(
    () =>
      columns.reduce(
        (sum, col, i) => sum + (widths[col.key] ?? baseColWidth(col, i)),
        selectable ? SELECT_COL_WIDTH : 0,
      ),
    [columns, widths, selectable],
  );

  const selectedCount = selectedKeys
    ? sortedRows.reduce((n, r) => n + (selectedKeys.has(rowKey(r)) ? 1 : 0), 0)
    : 0;
  const allSelected = sortedRows.length > 0 && selectedCount === sortedRows.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="flex flex-col gap-2">
      {/* The white fill lives on the table, not this scroller, so the vertical
          scrollbar's gutter stays transparent (revealing the page) instead of
          painting a white strip beside the sticky header. */}
      <div
        className={cn(
          "scroll-area overflow-auto rounded-2xl border border-line",
          className,
        )}
        style={{ maxHeight }}
      >
        <table
          ref={tableRef}
          style={{ minWidth: tableMinWidth }}
          className="w-full table-auto border-collapse bg-surface text-sm"
        >
          <colgroup>
            {selectable && <col style={{ width: SELECT_COL_WIDTH }} />}
            {columns.map((col, i) => (
              <col
                key={col.key}
                style={{ width: widths[col.key] ?? baseColWidth(col, i) }}
              />
            ))}
          </colgroup>
          <thead>
            <tr className="text-left">
              {selectable && (
                <th
                  className="sticky left-0 top-0 z-40 bg-surface px-3 shadow-[inset_0_-2px_0_0_var(--color-line-strong)]"
                >
                  <span className="flex items-center justify-center py-3">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={() => onToggleAll?.(sortedRows)}
                      ariaLabel={allSelected ? "Deselect all rows" : "Select all rows"}
                    />
                  </span>
                </th>
              )}
              {columns.map((col, i) => {
                const align: Align = col.align ?? (i === 0 ? "left" : "center");
                const isSorted = sortKey === col.key;
                const stickyLeft = i === 0;
                return (
                  <th
                    key={col.key}
                    aria-sort={
                      isSorted
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    style={stickyLeft && selectable ? { left: SELECT_COL_WIDTH } : undefined}
                    className={cn(
                      "sticky top-0 bg-surface py-0 shadow-[inset_0_-2px_0_0_var(--color-line-strong)]",
                      align === "center" ? "px-2" : "px-4",
                      TEXT_ALIGN[align],
                      // First column also sticks to the left; sits above peers.
                      stickyLeft ? (selectable ? "z-30" : "left-0 z-30") : "z-20",
                    )}
                  >
                    {col.sortValue ? (
                      <SortButton
                        label={col.header}
                        align={align}
                        active={isSorted}
                        dir={sortDir}
                        onClick={() => toggleSort(col.key)}
                      />
                    ) : (
                      <span className={cn("block py-3 type-label-xs text-muted", TEXT_ALIGN[align])}>
                        {col.header}
                      </span>
                    )}
                    {/* Drag the right edge to resize this column. */}
                    {i < columns.length - 1 && (
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={(e) => startResize(e, col.key)}
                        onClick={(e) => e.stopPropagation()}
                        className="group/resize absolute right-0 top-0 z-10 h-full w-3 translate-x-1/2 cursor-col-resize select-none touch-none after:absolute after:inset-y-2 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-line-strong after:transition-all hover:after:inset-y-0 hover:after:w-[3px] hover:after:bg-secondary"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const key = rowKey(row);
              const isSelected = selectedKeys?.has(key) ?? false;
              return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "group border-t border-line",
                  isSelected && "bg-row-selected",
                  onRowClick && "cursor-pointer hover:bg-row-hover",
                )}
              >
                {selectable && (
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "sticky left-0 z-10 bg-surface",
                      isSelected && "bg-row-selected",
                      onRowClick && "group-hover:bg-row-hover",
                    )}
                  >
                    <span className="flex items-center justify-center py-2.5">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleRow?.(row)}
                        ariaLabel="Select row"
                      />
                    </span>
                  </td>
                )}
                {columns.map((col, i) => {
                  const align: Align = col.align ?? (i === 0 ? "left" : "center");
                  // Constrain (fix width + truncate) when the user has resized
                  // the column, or it opts into clipping at its base width.
                  const cap =
                    widths[col.key] ??
                    (col.clip ? baseColWidth(col, i) : undefined);
                  if (i === 0) {
                    return (
                      <th
                        key={col.key}
                        scope="row"
                        style={{
                          ...(selectable ? { left: SELECT_COL_WIDTH } : {}),
                          ...(cap !== undefined
                            ? { width: cap, maxWidth: cap }
                            : {}),
                        }}
                        className={cn(
                          "sticky z-10 whitespace-nowrap bg-surface px-4 py-2.5 text-left font-medium text-ink",
                          cap !== undefined && "overflow-hidden text-ellipsis",
                          !selectable && "left-0",
                          isSelected && "bg-row-selected",
                          onRowClick && "group-hover:bg-row-hover",
                        )}
                      >
                        {col.cell(row)}
                      </th>
                    );
                  }
                  return (
                    <td
                      key={col.key}
                      style={
                        cap !== undefined
                          ? { width: cap, maxWidth: cap }
                          : undefined
                      }
                      className={cn(
                        "whitespace-nowrap px-2 py-2",
                        cap !== undefined && "overflow-hidden text-ellipsis",
                        TEXT_ALIGN[align],
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  );
                })}
              </tr>
              );
            })}
            {sortedRows.length === 0 && emptyMessage && (
              <tr>
                <td
                  colSpan={columns.length + selOffset}
                  className="px-4 py-12 text-center type-body-sm text-subtle"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {caption && <p className="type-body-xs text-subtle">{caption}</p>}
    </div>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="focus-ring h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--color-primary)]"
    />
  );
}

function SortButton({
  label,
  align,
  active,
  dir,
  onClick,
}: {
  label: ReactNode;
  align: Align;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring -mx-2 flex w-[calc(100%+1rem)] items-center gap-1 rounded-md px-2 py-3 type-label-xs transition-colors hover:text-ink",
        active ? "text-ink" : "text-muted",
        JUSTIFY[align],
      )}
    >
      <span>{label}</span>
      <SortArrows active={active} dir={dir} />
    </button>
  );
}

function SortArrows({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("h-3 w-3 shrink-0", active ? "text-primary" : "text-subtle/60")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 6.5 8 3.5l3 3" opacity={active && dir === "desc" ? 0.3 : 1} />
      <path d="M5 9.5 8 12.5l3-3" opacity={active && dir === "asc" ? 0.3 : 1} />
    </svg>
  );
}

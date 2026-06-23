"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { type ControlSize } from "./Field";

type Option = { value: string; label: string };

/**
 * Searchable multi-select combobox styled to match the brand input
 * (Figma node 69:37). Selected values render as removable chips inside the
 * control; type to filter and click / Enter to toggle options. Hands back the
 * full selected array via `onChange`. Sibling to <Dropdown> (single-select).
 */
export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = "Search…",
  emptyLabel = "Any",
  size = "md",
  id,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Placeholder shown when nothing is selected (e.g. "Any state"). */
  emptyLabel?: string;
  size?: ControlSize;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const listId = `${id ?? autoId}-listbox`;

  const selectedSet = useMemo(() => new Set(values), [values]);
  const labelFor = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return (v: string) => map.get(v) ?? v;
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function toggle(value: string) {
    onChange(
      selectedSet.has(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  // Dismiss when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option in range and scrolled into view.
  useEffect(() => {
    if (active > filtered.length - 1) setActive(0);
  }, [filtered.length, active]);

  useEffect(() => {
    if (open) {
      document
        .getElementById(`${listId}-opt-${active}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [active, open, listId]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          break;
        }
        setActive((a) => Math.min(a + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Enter":
        if (open && filtered[active]) {
          e.preventDefault();
          toggle(filtered[active].value);
        }
        break;
      case "Backspace":
        // Empty query → pop the last chip.
        if (query === "" && values.length > 0) {
          onChange(values.slice(0, -1));
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  }

  const pad = size === "md" ? "px-2 py-1.5" : "px-1.5 py-1";

  return (
    <div ref={rootRef} className="relative">
      <div
        onMouseDown={(e) => {
          if (disabled) return;
          // Ignore presses that originate on a chip's remove button.
          if ((e.target as HTMLElement).closest("[data-chip-remove]")) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={cn(
          "focus-within:border-secondary flex w-full flex-wrap items-center gap-1.5 rounded-[12px] border-2 border-field-border bg-surface transition-colors hover:border-secondary",
          pad,
          ariaInvalid && "border-field-error hover:border-field-error",
          disabled && "cursor-not-allowed opacity-60",
          size === "md" ? "min-h-[52px]" : "min-h-[42px]",
          className,
        )}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-[8px] bg-filler/50 py-0.5 pl-2 pr-1 text-[13px] font-medium text-primary-700"
          >
            {labelFor(v)}
            {!disabled && (
              <button
                type="button"
                data-chip-remove
                tabIndex={-1}
                aria-label={`Remove ${labelFor(v)}`}
                onClick={() => toggle(v)}
                className="focus-ring grid h-4 w-4 place-items-center rounded-full text-primary-700/70 hover:bg-primary/15 hover:text-primary-700"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="h-3 w-3"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={values.length === 0 ? emptyLabel : placeholder}
          value={query}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-opt-${active}` : undefined}
          aria-invalid={ariaInvalid}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-w-[6ch] flex-1 bg-transparent px-1 py-0.5 text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-field-placeholder"
        />
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-multiselectable
          className="scroll-area absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-[12px] border-2 border-field-border bg-surface p-1.5 shadow-xl outline-none"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-[14px] text-field-placeholder">
              No matches
            </li>
          ) : (
            filtered.map((o, i) => {
              const isSel = selectedSet.has(o.value);
              const isActive = i === active;
              return (
                <li
                  key={o.value}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-[14px] font-medium transition-colors",
                    isActive ? "bg-filler/50" : "",
                    isSel ? "text-primary" : "text-ink",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <CheckIcon />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-primary"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

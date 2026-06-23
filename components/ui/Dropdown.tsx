"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { controlClasses, type ControlSize } from "./Field";

type Option = { value: string; label: string };

/**
 * Searchable single-select combobox styled to match the brand input
 * (Figma node 69:37). Type to filter; click or keyboard-select an option.
 * Drop-in for the old <Select>: same `options` / `value` / `placeholder`,
 * but `onChange` hands back the value directly instead of an event.
 */
export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Search…",
  size = "md",
  id,
  name,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
}: {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: ControlSize;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // `query` is only meaningful while the user is actively typing.
  const [typing, setTyping] = useState(false);
  // -1 = nothing highlighted. The highlight is driven by pointer hover or
  // keyboard nav only — opening the menu must not pre-select the first option.
  const [active, setActive] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const listId = `${id ?? autoId}-listbox`;

  const selected = options.find((o) => o.value === value);
  // Closed / not typing → show the selection. Typing → show the query.
  const inputValue = typing ? query : (selected?.label ?? "");

  const filtered = useMemo(() => {
    if (!typing || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, typing]);

  function commit(opt: Option | undefined) {
    if (opt) onChange?.(opt.value);
    setOpen(false);
    setTyping(false);
    setQuery("");
  }

  function revert() {
    setOpen(false);
    setTyping(false);
    setQuery("");
  }

  // Dismiss (reverting any half-typed query) when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) revert();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option in range and scrolled into view.
  useEffect(() => {
    if (active > filtered.length - 1) setActive(filtered.length > 0 ? 0 : 0);
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
          // Opening via keyboard highlights the first option so the user has
          // something to navigate from; opening via pointer leaves it bare.
          setOpen(true);
          setActive(0);
          break;
        }
        setActive((a) => Math.min(a + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Enter":
        if (open) {
          e.preventDefault();
          commit(filtered[active]);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          revert();
        }
        break;
      case "Tab":
        revert();
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={inputValue}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-opt-${active}` : undefined
        }
        aria-invalid={ariaInvalid}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        onFocus={(e) => {
          // Select-to-overtype, but don't open here: a <label htmlFor> click
          // focuses the input, and that shouldn't pop the menu open.
          if (!disabled) e.target.select();
        }}
        onMouseDown={() => {
          // Open on a real pointer press of the input. A label click forwards
          // only a `click` (no mousedown on the input), so it won't open here.
          if (!disabled) {
            setOpen(true);
            setActive(-1);
          }
        }}
        onChange={(e) => {
          setTyping(true);
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className={controlClasses(size, cn("pr-9", className))}
      />

      {name && <input type="hidden" name={name} value={value ?? ""} />}

      <Chevron
        open={open}
        onMouseDown={(e) => {
          // Toggle without stealing focus from the input.
          e.preventDefault();
          if (disabled) return;
          if (open) revert();
          else {
            setOpen(true);
            setActive(-1);
            inputRef.current?.focus();
          }
        }}
      />

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="scroll-area absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-[12px] border-2 border-field-border bg-surface p-1.5 shadow-xl outline-none"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-[14px] text-field-placeholder">
              No matches
            </li>
          ) : (
            filtered.map((o, i) => {
              const isSel = o.value === value;
              const isActive = i === active;
              return (
                <li
                  key={o.value}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(o)}
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

function Chevron({
  open,
  onMouseDown,
}: {
  open: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onMouseDown={onMouseDown}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
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

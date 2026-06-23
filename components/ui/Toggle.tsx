"use client";

import { cn } from "@/lib/cn";

/** Controlled segmented control — used for tri-state rule outcomes and view tabs. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  variant = "filler",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  /** Container fill: "filler" (lavender, default) or "surface" (white). */
  variant?: "filler" | "surface";
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex rounded-xl p-1 ring-1 ring-line",
        variant === "surface" ? "bg-surface" : "bg-filler/40",
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-ring rounded-lg transition-colors",
              size === "sm" ? "px-2.5 py-1 type-label-xs" : "px-3 py-1.5 type-label-sm",
              active
                ? variant === "surface"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface text-ink shadow-sm ring-1 ring-line-strong"
                : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

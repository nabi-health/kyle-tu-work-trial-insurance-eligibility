"use client";

import { useState } from "react";
import { RuleSummary } from "@/components/rules/RuleSummary";
import { ruleCriteriaLabel, stripId } from "@/components/rules/rule-helpers";
import { cn } from "@/lib/cn";
import type { Rule } from "@/lib/eligibility/types";

/**
 * A referenced rule shown inline in the chat — collapsed by default (just the
 * criteria label), expanding to the full RuleSummary on click. White background.
 */
export function ChatRuleCard({ rule }: { rule: Rule }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-filler/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="truncate type-label-sm text-ink">
            {ruleCriteriaLabel(rule)}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "h-4 w-4 shrink-0 text-subtle transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-4">
          <RuleSummary data={stripId(rule)} />
        </div>
      )}
    </div>
  );
}

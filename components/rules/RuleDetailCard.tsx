"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/Toggle";
import type { AuditAction, Rule, RuleFields } from "@/lib/eligibility/types";
import { DeleteRuleButton } from "./DeleteRuleButton";
import { RuleFieldset } from "./RuleFieldset";
import { SummaryPanel } from "./RuleSummary";
import { stripId } from "./rule-helpers";

/** One version in a rule's history — enough to render its diff and a list label. */
export type RuleVersion = {
  id: string;
  action: AuditAction;
  actor: string;
  /** Preformatted "when" (formatted server-side to avoid hydration drift). */
  when: string;
  before: RuleFields | null;
  after: RuleFields | null;
  changeCount: number;
};

const noop = () => {};

const ACTION_VERB: Record<AuditAction, string> = {
  create: "Created",
  update: "Edited",
  delete: "Deleted",
};

/** The read-only rule view, with Details / History subtabs. */
export function RuleDetailCard({
  rule,
  versions,
}: {
  rule: Rule;
  versions: RuleVersion[];
}) {
  const [tab, setTab] = useState<"details" | "history">("details");
  const [fmt, setFmt] = useState<"form" | "json">("form");

  const tabs: { value: "details" | "history"; label: string }[] = [
    { value: "details", label: "Details" },
    {
      value: "history",
      label: `History${versions.length ? ` (${versions.length})` : ""}`,
    },
  ];

  return (
    <div
      className={`mx-auto w-full ${tab === "history" ? "max-w-5xl" : "max-w-3xl"}`}
    >
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={
                  "focus-ring rounded-lg px-3 py-1.5 type-label-sm transition-colors " +
                  (tab === t.value
                    ? "bg-filler/50 text-ink"
                    : "text-muted hover:text-ink")
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "details" && (
            <DetailsActions rule={rule} fmt={fmt} onFmt={setFmt} />
          )}
        </CardHeader>
        <CardBody>
          {tab === "details" ? (
            <DetailsView rule={rule} fmt={fmt} />
          ) : (
            <HistoryView versions={versions} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DetailsActions({
  rule,
  fmt,
  onFmt,
}: {
  rule: Rule;
  fmt: "form" | "json";
  onFmt: (v: "form" | "json") => void;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        value={fmt}
        onChange={onFmt}
        size="sm"
        options={[
          { value: "form", label: "Form" },
          { value: "json", label: "JSON" },
        ]}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => router.push(`/rules/${rule.id}/edit`)}
      >
        <PencilIcon />
        Edit
      </Button>
      <DeleteRuleButton rule={rule} />
    </div>
  );
}

function DetailsView({ rule, fmt }: { rule: Rule; fmt: "form" | "json" }) {
  const fields = useMemo(() => stripId(rule), [rule]);
  const jsonDraft = useMemo(() => JSON.stringify(fields, null, 2), [fields]);
  return (
    <RuleFieldset
      fields={fields}
      setField={noop}
      setStates={noop}
      errors={{}}
      disabled
      tab={fmt}
      jsonDraft={jsonDraft}
      setJsonDraft={noop}
      jsonError={null}
    />
  );
}

function HistoryView({ versions }: { versions: RuleVersion[] }) {
  const [selected, setSelected] = useState(0);

  if (versions.length === 0) {
    return (
      <p className="type-body-sm text-muted">
        No changes recorded yet. Edits to this rule will show up here.
      </p>
    );
  }

  const v = versions[Math.min(selected, versions.length - 1)];

  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,240px)_1fr]">
      {/* Version list */}
      <ul className="flex flex-col gap-1 sm:border-r sm:border-line sm:pr-3">
        {versions.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setSelected(i)}
              aria-current={i === selected}
              className={
                "focus-ring w-full rounded-xl px-3 py-2.5 text-left transition-colors " +
                (i === selected ? "bg-filler/50" : "hover:bg-filler/30")
              }
            >
              <span className="block type-label-sm text-ink">
                {ACTION_VERB[item.action]}
                {item.action === "update" && item.changeCount > 0 && (
                  <span className="font-normal text-subtle">
                    {" "}
                    · {item.changeCount} field
                    {item.changeCount > 1 ? "s" : ""}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block type-body-xs text-subtle">
                {item.actor} · {item.when}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Selected version diff */}
      <div className="min-w-0">
        {v.before && v.after ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryPanel label="Before" data={v.before} />
            <SummaryPanel label="After" accent data={v.after} />
          </div>
        ) : v.after ? (
          <SummaryPanel label="Created" accent data={v.after} />
        ) : v.before ? (
          <SummaryPanel label="Deleted" data={v.before} />
        ) : null}
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import type { RuleFields } from "@/lib/eligibility/types";
import { display } from "./rule-helpers";

const MATCH_FIELDS: { key: keyof RuleFields; label: string }[] = [
  { key: "payer_group", label: "Payer group" },
  { key: "payer_id", label: "Payer ID(s)" },
  { key: "plan_type", label: "Plan type" },
  { key: "plan_structure", label: "Plan structure" },
  { key: "group_number", label: "Group number" },
  { key: "service_state", label: "Service state(s)" },
];

/** A label/value line in the summary, label left and value right. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="shrink-0 type-body-xs text-subtle">{label}</span>
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  );
}

/** Full human-readable summary of a rule — its match criteria, outcomes and notes. */
export function RuleSummary({ data }: { data: RuleFields }) {
  return (
    <div className="flex flex-col gap-7">
      <section>
        <p className="mb-1 type-subhead-2xs text-subtle">Match criteria</p>
        <div className="divide-y divide-line">
          {MATCH_FIELDS.map((f) => (
            <Row key={f.key} label={f.label}>
              <span className="type-body-sm font-medium text-ink">
                {display(data[f.key])}
              </span>
            </Row>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-1 type-subhead-2xs text-subtle">Outcomes</p>
        <div className="divide-y divide-line">
          {OUTCOME_KEYS.map((k) => (
            <Row key={k} label={OUTCOME_LABELS[k]}>
              <Badge tone={outcomeTone(k, data[k])}>{display(data[k])}</Badge>
            </Row>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 type-subhead-2xs text-subtle">Notes</p>
        <p className="whitespace-pre-wrap type-body-sm text-ink">
          {data.notes.trim() === "" ? "—" : data.notes}
        </p>
      </section>
    </div>
  );
}

/** Labeled card wrapping a RuleSummary — one for "Before", one for "After". */
export function SummaryPanel({
  label,
  accent,
  data,
}: {
  label: string;
  accent?: boolean;
  data: RuleFields;
}) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-line">
      <div className="border-b border-line px-5 py-3">
        <p
          className={
            accent ? "type-subhead-2xs text-primary" : "type-subhead-2xs text-subtle"
          }
        >
          {label}
        </p>
      </div>
      <div className="px-5 py-5">
        <RuleSummary data={data} />
      </div>
    </div>
  );
}

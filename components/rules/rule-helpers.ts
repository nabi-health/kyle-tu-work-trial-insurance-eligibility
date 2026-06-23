import {
  OUTCOME_VALUES,
  US_STATES,
} from "@/lib/eligibility/constants";
import type { OutcomeKey, Rule, RuleFields } from "@/lib/eligibility/types";

/** A blank rule — wildcards everywhere, outcomes pending review. */
export const EMPTY: RuleFields = {
  payer_group: "*",
  payer_id: "*",
  plan_type: "*",
  group_number: "*",
  plan_structure: "*",
  service_state: "*",
  serviceable: "Needs Review",
  pre_auth_required: "Needs Review",
  referral_required: "Needs Review",
  preventative_coverage: "Needs Review",
  last_verified: "",
  verified_by: "",
  notes: "",
};

export function stripId(rule: Rule): RuleFields {
  const copy: Partial<Rule> = { ...rule };
  delete copy.id;
  return copy as RuleFields;
}

export const display = (v: string) => (v.trim() === "*" || v === "" ? "Any" : v);

/** A short, legible label for a rule's match criteria (for chips/references). */
export function ruleCriteriaLabel(rule: Rule): string {
  return [
    display(rule.payer_group),
    display(rule.plan_type),
    display(rule.plan_structure),
    stateScope(rule.service_state),
  ].join(" · ");
}

export const wildcardOpts = (values: string[]) =>
  [{ value: "*", label: "Any (*)" }].concat(
    values.map((v) => ({ value: v, label: v })),
  );

export const outcomeOpts = (key: OutcomeKey) =>
  OUTCOME_VALUES[key].map((v) => ({
    value: v,
    label: v === "*" ? "Any (*)" : v,
  }));

/** "*" is an explicit "All states" choice — not the absence of a choice. */
export const ALL_STATES = "*";
export const stateOpts = [
  { value: ALL_STATES, label: "All states (*)" },
  ...US_STATES.map((s) => ({ value: s, label: s })),
];

/**
 * service_state is stored as a CSV list ("CA,WA") or "*" (all states). Empty is
 * left empty on purpose so validation rejects it — "no states" is not "any".
 */
export const parseStates = (v: string): string[] =>
  v.trim() === ALL_STATES
    ? [ALL_STATES]
    : v.trim() === ""
      ? []
      : Array.from(
          new Set(v.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)),
        );

export const serializeStates = (arr: string[]): string =>
  arr.includes(ALL_STATES) ? ALL_STATES : arr.join(",");

/**
 * Condense a service_state CSV for compact display so long lists (e.g. 40
 * states) don't blow out a table row. Wildcard / empty reads as "All states".
 */
export function stateScope(value: string): string {
  const states = parseStates(value);
  if (states.length === 0 || states.includes(ALL_STATES)) return "All states";
  if (states.length <= 4) return states.join(", ");
  return `${states.slice(0, 4).join(", ")} +${states.length - 4} more`;
}

/**
 * Rule content fields, in display order, excluding the auto-stamped meta
 * (last_verified / verified_by) which are surfaced as "who / when" instead.
 */
export const CONTENT_FIELDS: { key: keyof RuleFields; label: string }[] = [
  { key: "payer_group", label: "Payer group" },
  { key: "payer_id", label: "Payer ID(s)" },
  { key: "plan_type", label: "Plan type" },
  { key: "plan_structure", label: "Plan structure" },
  { key: "group_number", label: "Group number" },
  { key: "service_state", label: "Service state(s)" },
  { key: "serviceable", label: "Serviceable" },
  { key: "pre_auth_required", label: "Pre-auth Required" },
  { key: "referral_required", label: "Referral Required" },
  { key: "preventative_coverage", label: "Preventative Coverage" },
  { key: "notes", label: "Notes" },
];

const fieldDisplay = (key: keyof RuleFields, v: string) =>
  key === "notes" ? (v.trim() === "" ? "—" : v) : display(v);

export type FieldChange = { label: string; from: string; to: string };

/** Field-level diff of a rule's content between two snapshots. */
export function ruleChanges(
  before: Partial<RuleFields> | null,
  after: Partial<RuleFields> | null,
): FieldChange[] {
  if (!before || !after) return [];
  const changes: FieldChange[] = [];
  for (const f of CONTENT_FIELDS) {
    const from = String(before[f.key] ?? "");
    const to = String(after[f.key] ?? "");
    if (from !== to) {
      changes.push({
        label: f.label,
        from: fieldDisplay(f.key, from),
        to: fieldDisplay(f.key, to),
      });
    }
  }
  return changes;
}

/**
 * Resolve a new service_state value, keeping "All states" and specific states
 * mutually exclusive: choosing All clears specifics, and a specific pick clears All.
 */
export function nextStateSelection(current: string, next: string[]): string {
  const cur = parseStates(current);
  const added = next.find((v) => !cur.includes(v));
  const result =
    added === ALL_STATES
      ? [ALL_STATES]
      : added
        ? next.filter((v) => v !== ALL_STATES)
        : next;
  return serializeStates(result);
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Field } from "@/components/ui/Field";
import { MatrixTable, type MatrixColumn } from "@/components/ui/MatrixTable";
import { PLAN_TYPES, US_STATES } from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import { type OutcomeKey, type Rule, WILDCARD } from "@/lib/eligibility/types";

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

const isWild = (v: string) => v.trim() === "" || v.trim() === WILDCARD;

/**
 * Filter semantics for one dimension, with three distinct selections:
 *   ""  → "None": no filter, every rule passes (the default — returns all data).
 *   "*" → the wildcard option ("All states" etc.): passes only rules whose own
 *         value is the wildcard (the broad baseline rules).
 *   else → a concrete value: exact match (or CSV membership for the state list),
 *         excluding wildcard baseline rows.
 */
function fieldPass(ruleValue: string, filter: string, isList = false): boolean {
  if (filter === "") return true; // None
  if (filter === WILDCARD) return isWild(ruleValue); // All — rule is wildcard
  if (isWild(ruleValue)) return false; // concrete filter excludes wildcards
  if (isList) return ruleValue.split(",").some((s) => s.trim() === filter);
  return ruleValue.trim() === filter;
}

// Render a rule dimension: a wildcard reads as a muted "Any …" baseline label,
// a concrete value passes through verbatim.
const dimCell = (v: string, anyLabel = "Any"): ReactNode =>
  isWild(v) ? <span className="text-muted">{anyLabel}</span> : v;

// The four eligibility outcomes, shown as their raw per-rule values (no
// aggregation) so nothing is collapsed away.
const OUTCOME_COLS: { key: OutcomeKey; header: string }[] = [
  { key: "serviceable", header: "Serviceable" },
  { key: "pre_auth_required", header: "Pre-auth" },
  { key: "referral_required", header: "Referral" },
  { key: "preventative_coverage", header: "Preventative" },
];

export function CoverageMatrix({
  rules,
  payerGroups,
}: {
  rules: Rule[];
  payerGroups: string[];
}) {
  // All three default to "None" (empty) so the table opens showing every rule.
  const [state, setState] = useState("");
  const [planType, setPlanType] = useState("");
  const [payerFilter, setPayerFilter] = useState("");

  // Each filter offers None, the wildcard ("All …"), then the concrete values.
  const stateOptions = useMemo(
    () => [
      { value: "", label: "None" },
      { value: WILDCARD, label: "All states" },
      ...opts(US_STATES),
    ],
    [],
  );
  const planTypeOptions = useMemo(
    () => [
      { value: "", label: "None" },
      { value: WILDCARD, label: "All plan types" },
      ...opts(PLAN_TYPES),
    ],
    [],
  );
  const payerOptions = useMemo(
    () => [
      { value: "", label: "None" },
      { value: WILDCARD, label: "All payers" },
      ...payerGroups
        .filter((p) => !isWild(p))
        .map((p) => ({ value: p, label: p })),
    ],
    [payerGroups],
  );

  const visible = useMemo(
    () =>
      rules.filter(
        (r) =>
          fieldPass(r.service_state, state, true) &&
          fieldPass(r.plan_type, planType) &&
          fieldPass(r.payer_group, payerFilter),
      ),
    [rules, state, planType, payerFilter],
  );

  const columns = useMemo<MatrixColumn<Rule>[]>(
    () => [
      {
        key: "payer_group",
        header: "Payer",
        align: "left",
        clip: true,
        sortValue: (r) => (isWild(r.payer_group) ? "" : r.payer_group),
        cell: (r) => dimCell(r.payer_group, "Any payer"),
      },
      {
        key: "plan_type",
        header: "Plan type",
        align: "left",
        sortValue: (r) => (isWild(r.plan_type) ? "" : r.plan_type),
        cell: (r) => dimCell(r.plan_type),
      },
      {
        key: "plan_structure",
        header: "Structure",
        align: "left",
        sortValue: (r) => (isWild(r.plan_structure) ? "" : r.plan_structure),
        cell: (r) => dimCell(r.plan_structure),
      },
      {
        key: "service_state",
        header: "State(s)",
        align: "left",
        clip: true,
        sortValue: (r) => (isWild(r.service_state) ? "" : r.service_state),
        cell: (r) => dimCell(r.service_state, "All states"),
      },
      ...OUTCOME_COLS.map<MatrixColumn<Rule>>(({ key, header }) => ({
        key,
        header,
        align: "center",
        sortValue: (r) => r[key],
        cell: (r) =>
          isWild(r[key]) ? (
            <span className="text-subtle">—</span>
          ) : (
            <Badge tone={outcomeTone(key, r[key])}>{r[key]}</Badge>
          ),
      })),
    ],
    [],
  );

  const summary = useMemo(() => {
    let yes = 0,
      no = 0;
    for (const r of visible) {
      if (r.serviceable === "Yes") yes++;
      else if (r.serviceable === "No") no++;
    }
    return { yes, no, total: visible.length };
  }, [visible]);

  // Human-readable description of the active filters for the summary captions.
  const labelFor = (v: string, allLabel: string) =>
    v === "" ? null : v === WILDCARD ? allLabel : v;
  const activeFilters =
    [
      labelFor(payerFilter, "All payers"),
      labelFor(planType, "All plan types"),
      labelFor(state, "All states"),
    ]
      .filter(Boolean)
      .join(" · ") || "no filters";

  return (
    <div className="flex flex-col gap-5">
      {/* Filters — each defaults to "None" (no filter). "All …" selects the
          wildcard baseline rows specifically. */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="State" className="w-48">
          <Dropdown size="sm" options={stateOptions} value={state}
            onChange={setState} />
        </Field>
        <Field label="Plan type" className="w-52">
          <Dropdown size="sm" options={planTypeOptions} value={planType}
            onChange={setPlanType} />
        </Field>
        <Field label="Payer" className="w-56">
          <Dropdown size="sm" options={payerOptions} value={payerFilter}
            placeholder="Search payer…" onChange={setPayerFilter} />
        </Field>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {[
          { label: "Rules shown", value: summary.total, tone: "text-ink" },
          { label: "Serviceable", value: summary.yes, tone: "text-success" },
          { label: "Not serviceable", value: summary.no, tone: "text-danger" },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className={`font-display text-2xl font-semibold ${s.tone}`}>
              {s.value}
            </p>
            <p className="type-body-xs text-muted">
              {s.label} · {activeFilters}
            </p>
          </Card>
        ))}
      </div>

      {/* Every matching rule, one row per rule — no aggregation. */}
      <MatrixTable
        rows={visible}
        columns={columns}
        rowKey={(r) => r.id}
        emptyMessage="No rules match these filters."
      />
    </div>
  );
}

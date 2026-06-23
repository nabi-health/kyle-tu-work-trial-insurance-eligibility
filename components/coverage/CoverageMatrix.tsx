"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { evaluate } from "@/lib/eligibility/engine";
import {
  PLAN_STRUCTURES,
  PLAN_TYPES,
  US_STATES,
} from "@/lib/eligibility/constants";
import { DECISION_DISPLAY } from "@/lib/eligibility/presentation";
import type { Rule } from "@/lib/eligibility/types";

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

const CELL: Record<string, string> = {
  Yes: "bg-success-bg text-success",
  No: "bg-danger-bg text-danger",
  "Needs Review": "bg-warning-bg text-warning",
};
const SHORT: Record<string, string> = { Yes: "Yes", No: "No", "Needs Review": "Review" };

export function CoverageMatrix({
  rules,
  payerGroups,
}: {
  rules: Rule[];
  payerGroups: string[];
}) {
  const [state, setState] = useState("WA");
  const [planType, setPlanType] = useState("Commercial");
  const [payerFilter, setPayerFilter] = useState("");

  // "Any payer" baseline row first, then concrete payers.
  const rows = useMemo(() => {
    const filtered = payerGroups.filter((p) =>
      p.toLowerCase().includes(payerFilter.trim().toLowerCase()),
    );
    return ["*", ...filtered];
  }, [payerGroups, payerFilter]);

  const grid = useMemo(() => {
    return rows.map((payer) => ({
      payer,
      cells: PLAN_STRUCTURES.map((structure) => {
        const result = evaluate(
          {
            payer_group: payer,
            plan_type: planType,
            plan_structure: structure,
            service_state: state,
          },
          rules,
        );
        return {
          structure,
          serviceable: result.outcomes.serviceable.value,
          decision: result.decision,
          referral: result.outcomes.referral_required.value,
          preauth: result.outcomes.pre_auth_required.value,
          preventative: result.outcomes.preventative_coverage.value,
        };
      }),
    }));
  }, [rows, rules, planType, state]);

  const summary = useMemo(() => {
    let yes = 0,
      no = 0,
      review = 0;
    for (const r of grid)
      for (const c of r.cells) {
        if (c.serviceable === "Yes") yes++;
        else if (c.serviceable === "No") no++;
        else review++;
      }
    return { yes, no, review, total: yes + no + review };
  }, [grid]);

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="State" className="w-36">
          <Select options={opts(US_STATES)} value={state}
            onChange={(e) => setState(e.target.value)} />
        </Field>
        <Field label="Plan type" className="w-44">
          <Select options={opts(PLAN_TYPES)} value={planType}
            onChange={(e) => setPlanType(e.target.value)} />
        </Field>
        <Field label="Filter payers" className="w-56">
          <Input placeholder="Search payer…" value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)} />
        </Field>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {[
          { label: "Serviceable", value: summary.yes, tone: "text-success" },
          { label: "Not serviceable", value: summary.no, tone: "text-danger" },
          { label: "Needs review", value: summary.review, tone: "text-warning" },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className={`font-display text-2xl font-semibold ${s.tone}`}>
              {s.value}
            </p>
            <p className="text-xs text-muted">
              {s.label} · {planType} in {state}
            </p>
          </Card>
        ))}
      </div>

      {/* Matrix */}
      <div className="scroll-area max-h-[60vh] overflow-auto rounded-2xl border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-cream text-left text-xs">
              <th className="sticky left-0 z-20 bg-cream px-4 py-3 font-medium text-muted">
                Payer
              </th>
              {PLAN_STRUCTURES.map((s) => (
                <th key={s} className="px-4 py-3 text-center font-medium text-muted">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.payer} className="border-t border-line">
                <th className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left font-medium text-ink">
                  {row.payer === "*" ? (
                    <span className="text-muted">Any payer (baseline)</span>
                  ) : (
                    row.payer
                  )}
                </th>
                {row.cells.map((c) => (
                  <td key={c.structure} className="px-2 py-2 text-center">
                    <span
                      title={`${DECISION_DISPLAY[c.decision].label} — referral ${c.referral}, pre-auth ${c.preauth}, preventative ${c.preventative}`}
                      className={`inline-block min-w-[58px] rounded-lg px-2 py-1 text-xs font-medium ${
                        CELL[c.serviceable] ?? "bg-cream text-muted"
                      }`}
                    >
                      {SHORT[c.serviceable] ?? c.serviceable}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-subtle">
        Each cell shows serviceability for {planType} plans in {state}. Hover a
        cell for the full decision, referral, pre-auth and preventative outcomes.
      </p>
    </div>
  );
}

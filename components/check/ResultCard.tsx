"use client";

import { useState } from "react";
import Link from "next/link";
import { NabiCharacter, type NabiName } from "@/components/brand/NabiCharacter";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RuleOutcomeMatrix } from "@/components/check/RuleOutcomeMatrix";
import { RuleSummary } from "@/components/rules/RuleSummary";
import { display, stateScope, stripId } from "@/components/rules/rule-helpers";
import { cn } from "@/lib/cn";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { explainDecision } from "@/lib/eligibility/explain";
import {
  DECISION_DISPLAY,
  outcomeTone,
} from "@/lib/eligibility/presentation";
import type { Decision, EligibilityResult, Rule } from "@/lib/eligibility/types";

// Which Nabi companion delivers each decision. Ines (steady) carries the clear
// yes; Emi (empathy) softens the no; Caleb (curious) fronts the pending /
// uncertain answers that still need a question answered.
const DECISION_CHARACTER: Record<Decision, NabiName> = {
  guarantee: "ines",
  guarantee_after_referral: "caleb",
  not_eligible: "emi",
  needs_research: "caleb",
};

function RuleLine({ rule }: { rule: Rule }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
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
          <span className="min-w-0">
            <span className="block truncate type-label-sm text-ink">
              {display(rule.payer_group)}
            </span>
            <span className="mt-0.5 block truncate type-body-xs text-subtle">
              {display(rule.plan_type)} · {display(rule.plan_structure)} ·{" "}
              {stateScope(rule.service_state)}
            </span>
          </span>
        </button>
        <Link
          href={`/rules/${rule.id}/edit?from=check`}
          className="shrink-0 type-label-sm text-primary hover:underline"
        >
          Edit rule →
        </Link>
      </div>
      {open && (
        <div className="border-t border-line px-4 py-4">
          <RuleSummary data={stripId(rule)} />
        </div>
      )}
    </div>
  );
}

export function ResultCard({ result }: { result: EligibilityResult }) {
  const decision = DECISION_DISPLAY[result.decision];

  const driverIds = new Set(
    OUTCOME_KEYS.flatMap((k) => result.outcomes[k].drivingRuleIds),
  );
  const driverRules = result.matchedRules.filter((r) => driverIds.has(r.id));

  // Pre-fill a new rule with the exact inputs the user just checked, so the
  // no-match correction path lands on a form that's already scoped correctly.
  const newRuleHref = `/rules/new?${new URLSearchParams({
    payer_group: result.query.payer_group,
    plan_type: result.query.plan_type,
    plan_structure: result.query.plan_structure,
    service_state: result.query.service_state,
  }).toString()}`;

  return (
    <Card className="animate-result overflow-hidden">
      {/* Decision banner */}
      <div
        className={`flex items-start gap-4 px-5 py-5 ${
          decision.tone === "success"
            ? "bg-success-bg"
            : decision.tone === "danger"
              ? "bg-danger-bg"
              : "bg-warning-bg"
        }`}
      >
        <NabiCharacter
          name={DECISION_CHARACTER[result.decision]}
          size={44}
          title={decision.label}
          className="mt-0.5 shrink-0"
        />
        <div>
          <p className="type-subhead-2xs text-muted">
            Decision
          </p>
          <h2 className="type-title-h6 text-ink">
            {decision.label}
          </h2>
          <p className="mt-0.5 type-body-sm text-muted">{decision.blurb}</p>
          {result.hasMatch && (
            <p className="mt-2 type-body-sm font-medium text-ink">
              {explainDecision(result)}
            </p>
          )}
        </div>
      </div>

      {/* Outcome grid */}
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {OUTCOME_KEYS.map((key) => (
          <div key={key} className="bg-surface px-4 py-4">
            <p className="type-label-xs text-subtle">
              {OUTCOME_LABELS[key]}
            </p>
            <div className="mt-2">
              <Badge tone={outcomeTone(key, result.outcomes[key].value)}>
                {result.outcomes[key].value}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Explanation + correction CTA */}
      <div className="border-t border-line px-5 py-4">
        <p className="type-body-sm text-muted">
          {result.hasMatch
            ? `Aggregated from ${result.matchedRules.length} matching rule${
                result.matchedRules.length > 1 ? "s" : ""
              }.`
            : "No rule matched these inputs, so every outcome defaults to Needs Review."}
        </p>

        <div className="mt-4 flex flex-col gap-4">
            {!result.hasMatch && (
              <div className="rounded-xl border border-line bg-cream/60 px-4 py-3">
                <p className="type-label-sm text-ink">
                  No rule covers these inputs
                </p>
                <p className="mt-1 type-body-sm text-muted">
                  The result defaults to Needs Review because nothing in the
                  registry matches. Add a rule for this combination so future
                  checks return a real answer.
                </p>
                <Link
                  href={newRuleHref}
                  className="mt-2 inline-block type-label-sm text-primary hover:underline"
                >
                  Create a rule for these inputs →
                </Link>
              </div>
            )}
            {result.matchedRules.length > 0 && (
              <div>
                <p className="mb-2 type-label-sm text-ink">
                  How each rule contributed
                </p>
                <RuleOutcomeMatrix result={result} />
              </div>
            )}
            {driverRules.length > 0 && (
              <div>
                <p className="mb-2 type-label-sm text-ink">
                  Rules behind this result
                </p>
                <div className="flex flex-col gap-2">
                  {driverRules.map((r) => (
                    <RuleLine key={r.id} rule={r} />
                  ))}
                </div>
                <p className="mt-2 type-body-xs text-subtle">
                  If the answer is wrong, edit the driving rule above — changes
                  apply to every future check immediately.
                </p>
              </div>
            )}
            {result.matchedRules.length > driverRules.length && (
              <div>
                <p className="mb-2 type-label-sm text-ink">
                  Other matching rules
                </p>
                <div className="flex flex-col gap-2">
                  {result.matchedRules
                    .filter((r) => !driverIds.has(r.id))
                    .map((r) => (
                      <RuleLine key={r.id} rule={r} />
                    ))}
                </div>
              </div>
            )}
          </div>
      </div>
    </Card>
  );
}

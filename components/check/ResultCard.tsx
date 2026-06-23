"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import {
  DECISION_DISPLAY,
  outcomeTone,
} from "@/lib/eligibility/presentation";
import type { EligibilityResult, Rule } from "@/lib/eligibility/types";

const field = (v: string) => (v.trim() === "" || v.trim() === "*" ? "Any" : v);

function RuleLine({ rule, driver }: { rule: Rule; driver?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-cream/60 px-3 py-2.5">
      <div className="min-w-0 text-sm">
        <span className="font-medium text-ink">{field(rule.payer_group)}</span>
        <span className="text-subtle">
          {" · "}
          {field(rule.plan_type)} · {field(rule.plan_structure)} ·{" "}
          {field(rule.service_state)}
        </span>
        {driver && (
          <Badge tone="info" className="ml-2 align-middle">
            drove result
          </Badge>
        )}
      </div>
      <Link
        href={`/rules/${rule.id}?from=check`}
        className="shrink-0 text-[13px] font-medium text-primary hover:underline"
      >
        Edit rule →
      </Link>
    </div>
  );
}

export function ResultCard({ result }: { result: EligibilityResult }) {
  const [showRules, setShowRules] = useState(false);
  const decision = DECISION_DISPLAY[result.decision];

  const driverIds = new Set(
    OUTCOME_KEYS.flatMap((k) => result.outcomes[k].drivingRuleIds),
  );
  const driverRules = result.matchedRules.filter((r) => driverIds.has(r.id));

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
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
            decision.tone === "success"
              ? "bg-success"
              : decision.tone === "danger"
                ? "bg-danger"
                : "bg-warning"
          }`}
          aria-hidden
        >
          {decision.icon}
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Decision
          </p>
          <h2 className="font-display text-xl font-semibold text-ink">
            {decision.label}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{decision.blurb}</p>
        </div>
      </div>

      {/* Outcome grid */}
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {OUTCOME_KEYS.map((key) => (
          <div key={key} className="bg-surface px-4 py-4">
            <p className="text-xs font-medium text-subtle">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {result.hasMatch
              ? `Aggregated from ${result.matchedRules.length} matching rule${
                  result.matchedRules.length > 1 ? "s" : ""
                }.`
              : "No rule matched these inputs, so every outcome defaults to Needs Review."}
          </p>
          <div className="flex items-center gap-2">
            {result.matchedRules.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRules((s) => !s)}
              >
                {showRules ? "Hide rules" : "Show matching rules"}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRules(true)}
            >
              This looks wrong
            </Button>
          </div>
        </div>

        {showRules && (
          <div className="mt-4 flex flex-col gap-4">
            {driverRules.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink">
                  Rules behind this result
                </p>
                <div className="flex flex-col gap-2">
                  {driverRules.map((r) => (
                    <RuleLine key={r.id} rule={r} driver />
                  ))}
                </div>
                <p className="mt-2 text-xs text-subtle">
                  If the answer is wrong, edit the driving rule above — changes
                  apply to every future check immediately.
                </p>
              </div>
            )}
            {result.matchedRules.length > driverRules.length && (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink">
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
        )}
      </div>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import { display, stateScope } from "@/components/rules/rule-helpers";
import { Badge } from "@/components/ui/Badge";
import { MatrixTable, type MatrixColumn } from "@/components/ui/MatrixTable";
import {
  OUTCOME_KEYS,
  OUTCOME_LABELS,
  OUTCOME_PRIORITY,
} from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import {
  type EligibilityResult,
  type OutcomeKey,
  type Rule,
  WILDCARD,
} from "@/lib/eligibility/types";

const isWild = (v: string) => v.trim() === "" || v.trim() === WILDCARD;

const priorityLabel = (v: string) => (v === WILDCARD ? "Any" : v);

/**
 * The per-column precedence ladder (from OUTCOME_PRIORITY) that decides which
 * value wins when matching rules disagree — highest priority first.
 */
function PriorityLegend() {
  return (
    <div className="rounded-xl border border-line bg-row-selected px-4 py-3">
      <p className="type-label-xs text-subtle">
        When rules disagree, the highest-priority value wins (left → right)
      </p>
      <dl className="mt-2.5 flex flex-col gap-1.5">
        {OUTCOME_KEYS.map((key) => (
          <div
            key={key}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
          >
            <dt className="shrink-0 type-body-xs text-muted sm:w-44">
              {OUTCOME_LABELS[key]}
            </dt>
            <dd className="flex flex-wrap items-center gap-1.5 type-body-xs text-ink">
              {OUTCOME_PRIORITY[key].map((v, i) => (
                <span key={v} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-subtle">›</span>}
                  <span className={v === WILDCARD ? "text-subtle" : "font-medium"}>
                    {priorityLabel(v)}
                  </span>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * One row per matching rule, one column per outcome. The cell that drove each
 * column's aggregated value (rule id in that column's drivingRuleIds) is shown
 * at full strength with a ring; rules that were outranked are dimmed. Lets you
 * see at a glance which rule won which column as the match set grows.
 */
export function RuleOutcomeMatrix({ result }: { result: EligibilityResult }) {
  // Winning rule ids per column — precomputed once for cell highlighting.
  const winners = useMemo(
    () =>
      Object.fromEntries(
        OUTCOME_KEYS.map((k) => [k, new Set(result.outcomes[k].drivingRuleIds)]),
      ) as Record<OutcomeKey, Set<string>>,
    [result],
  );

  const columns = useMemo<MatrixColumn<Rule>[]>(
    () => [
      {
        key: "rule",
        header: "Rule",
        align: "left",
        clip: true,
        width: 200,
        sortValue: (r) => display(r.payer_group),
        cell: (r) => (
          <div className="min-w-0">
            <span className="block truncate type-label-sm text-ink">
              {display(r.payer_group)}
            </span>
            <span className="mt-0.5 block truncate type-body-xs text-subtle">
              {display(r.plan_type)} · {display(r.plan_structure)} ·{" "}
              {stateScope(r.service_state)}
            </span>
          </div>
        ),
      },
      ...OUTCOME_KEYS.map<MatrixColumn<Rule>>((key) => ({
        key,
        header: OUTCOME_LABELS[key],
        align: "center",
        sortValue: (r) => r[key],
        cell: (r) => {
          if (isWild(r[key])) return <span className="text-subtle">—</span>;
          const badge = (
            <Badge
              tone={outcomeTone(key, r[key])}
              className={winners[key].has(r.id) ? "ring-1 ring-current" : undefined}
            >
              {r[key]}
            </Badge>
          );
          return winners[key].has(r.id) ? (
            badge
          ) : (
            <span className="opacity-45">{badge}</span>
          );
        },
      })),
    ],
    [winners],
  );

  return (
    <div className="flex flex-col gap-3">
      <MatrixTable
        rows={result.matchedRules}
        columns={columns}
        rowKey={(r) => r.id}
        caption="Highlighted = drove the column's aggregated value; dimmed = overridden by a higher-priority rule."
      />
      <PriorityLegend />
    </div>
  );
}

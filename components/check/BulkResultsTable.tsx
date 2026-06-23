"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { MatrixTable, type MatrixColumn } from "@/components/ui/MatrixTable";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { DECISION_DISPLAY, outcomeTone } from "@/lib/eligibility/presentation";
import type { EligibilityResult } from "@/lib/eligibility/types";

/** A result paired with its original (0-based) upload row index — its stable key. */
export type IndexedResult = { id: number; result: EligibilityResult };

const INPUTS: { key: keyof EligibilityResult["query"]; header: string }[] = [
  { key: "payer_group", header: "Payer" },
  { key: "plan_type", header: "Plan type" },
  { key: "plan_structure", header: "Structure" },
  { key: "service_state", header: "State" },
];

/**
 * Every uploaded row with its computed outcomes and decision. Click a row to
 * open its full ResultCard in a modal.
 */
export function BulkResultsTable({
  results,
  onRowClick,
}: {
  results: IndexedResult[];
  onRowClick: (result: EligibilityResult) => void;
}) {
  const columns = useMemo<MatrixColumn<IndexedResult>[]>(
    () => [
      ...INPUTS.map<MatrixColumn<IndexedResult>>(({ key, header }) => ({
        key,
        header,
        align: "left",
        clip: true,
        sortValue: (r) => r.result.query[key],
        cell: (r) => r.result.query[key],
      })),
      {
        key: "decision",
        header: "Decision",
        align: "left",
        sortValue: (r) => r.result.decision,
        cell: (r) => {
          const d = DECISION_DISPLAY[r.result.decision];
          return <Badge tone={d.tone}>{d.label}</Badge>;
        },
      },
      ...OUTCOME_KEYS.map<MatrixColumn<IndexedResult>>((key) => ({
        key,
        header: OUTCOME_LABELS[key],
        align: "center",
        sortValue: (r) => r.result.outcomes[key].value,
        cell: (r) => (
          <Badge tone={outcomeTone(key, r.result.outcomes[key].value)}>
            {r.result.outcomes[key].value}
          </Badge>
        ),
      })),
      {
        key: "matched_rule_count",
        header: "Rules applied",
        align: "center",
        sortValue: (r) => r.result.matchedRules.length,
        cell: (r) => r.result.matchedRules.length,
      },
    ],
    [],
  );

  return (
    <MatrixTable
      rows={results}
      columns={columns}
      rowKey={(r) => String(r.id)}
      onRowClick={(r) => onRowClick(r.result)}
      emptyMessage="No results."
      caption="Click any row to see how its result was derived."
    />
  );
}

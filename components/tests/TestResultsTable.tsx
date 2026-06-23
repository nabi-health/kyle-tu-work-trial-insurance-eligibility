"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { MatrixTable, type MatrixColumn } from "@/components/ui/MatrixTable";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import type { TestRunResult } from "@/lib/tests/types";

const INPUTS: { key: keyof TestRunResult["test"]; header: string }[] = [
  { key: "payer_group", header: "Payer" },
  { key: "plan_type", header: "Plan type" },
  { key: "plan_structure", header: "Structure" },
  { key: "service_state", header: "State" },
];

/**
 * Every test with its current pass/fail status and per-column actual outcome.
 * A failing outcome is flagged in red with the value that was expected. Click a
 * row to open the full expected-vs-actual breakdown.
 */
export function TestResultsTable({
  runs,
  onRowClick,
}: {
  runs: TestRunResult[];
  onRowClick: (run: TestRunResult) => void;
}) {
  const columns = useMemo<MatrixColumn<TestRunResult>[]>(
    () => [
      {
        key: "name",
        header: "Test case",
        align: "left",
        clip: true,
        width: 220,
        sortValue: (r) => r.test.name,
        cell: (r) => r.test.name,
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        // Failing first under the default ascending sort.
        sortValue: (r) => (r.pass ? 1 : 0),
        cell: (r) => (
          <Badge tone={r.pass ? "success" : "danger"}>
            {r.pass ? "Pass" : "Fail"}
          </Badge>
        ),
      },
      ...INPUTS.map<MatrixColumn<TestRunResult>>(({ key, header }) => ({
        key: `in_${key}`,
        header,
        align: "left",
        clip: true,
        sortValue: (r) => r.test[key] as string,
        cell: (r) => r.test[key] as string,
      })),
      ...OUTCOME_KEYS.map<MatrixColumn<TestRunResult>>((key) => ({
        key,
        header: OUTCOME_LABELS[key],
        align: "center",
        sortValue: (r) => r.checks[key].actual,
        cell: (r) => {
          const c = r.checks[key];
          return (
            <div className="flex flex-col items-center gap-1">
              <Badge tone={c.pass ? outcomeTone(key, c.actual) : "danger"}>
                {c.actual}
              </Badge>
              {!c.pass && (
                <span className="type-body-xs text-danger">
                  exp: {c.expected}
                </span>
              )}
            </div>
          );
        },
      })),
    ],
    [],
  );

  return (
    <MatrixTable
      rows={runs}
      columns={columns}
      rowKey={(r) => r.test.id}
      onRowClick={onRowClick}
      defaultSort={{ key: "status", dir: "asc" }}
      emptyMessage="No test cases yet. Add one or upload a CSV/JSON to get started."
      caption="Click any row to see expected vs. actual and the rules behind the result."
    />
  );
}

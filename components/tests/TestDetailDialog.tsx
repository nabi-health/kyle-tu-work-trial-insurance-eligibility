"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { DECISION_DISPLAY, outcomeTone } from "@/lib/eligibility/presentation";
import { display, stateScope } from "@/components/rules/rule-helpers";
import type { TestRunResult } from "@/lib/tests/types";

/** Read-only expected-vs-actual breakdown for one test, with edit/delete. */
export function TestDetailDialog({
  run,
  onClose,
  onEdit,
  onDelete,
  deleting,
}: {
  run: TestRunResult | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  if (!run) return null;
  const { test, result } = run;
  const decision = DECISION_DISPLAY[result.decision];
  const inputs = `${display(test.payer_group)} · ${display(test.plan_type)} · ${display(
    test.plan_structure,
  )} · ${stateScope(test.service_state)}`;

  return (
    <Dialog
      open={!!run}
      onClose={onClose}
      title={test.name}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <Button variant="danger" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
          <Button variant="secondary" onClick={onEdit} disabled={deleting}>
            Edit
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Close
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={run.pass ? "success" : "danger"}>
            {run.pass ? "Passing" : "Failing"}
          </Badge>
          <span className="type-body-sm text-muted">{inputs}</span>
        </div>

        <div>
          <p className="mb-2 type-label-sm text-ink">Expected vs. actual</p>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-cream/50">
                  <th className="px-4 py-2 type-label-xs text-muted">Outcome</th>
                  <th className="px-4 py-2 type-label-xs text-muted">Expected</th>
                  <th className="px-4 py-2 type-label-xs text-muted">Actual</th>
                  <th className="px-4 py-2 type-label-xs text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {OUTCOME_KEYS.map((key) => {
                  const c = run.checks[key];
                  return (
                    <tr key={key} className="border-t border-line first:border-t-0">
                      <td className="px-4 py-2.5 type-body-sm text-ink">
                        {OUTCOME_LABELS[key]}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone="neutral">{c.expected}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={c.pass ? outcomeTone(key, c.actual) : "danger"}>
                          {c.actual}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 type-body-sm">
                        {c.pass ? (
                          <span className="text-success">✓</span>
                        ) : (
                          <span className="text-danger">✕ mismatch</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="type-label-xs text-subtle">Decision</span>
          <Badge tone={decision.tone}>{decision.label}</Badge>
          <span className="type-body-xs text-subtle">
            {result.hasMatch
              ? `Aggregated from ${result.matchedRules.length} matching rule${
                  result.matchedRules.length > 1 ? "s" : ""
                }.`
              : "No rule matched these inputs."}
          </span>
        </div>

        {test.notes && (
          <div className="rounded-xl border border-line bg-cream/40 px-4 py-3">
            <p className="type-label-xs text-subtle">Why</p>
            <p className="mt-1 type-body-sm text-muted">{test.notes}</p>
          </div>
        )}

        {!run.pass && result.matchedRules.length > 0 && (
          <p className="type-body-xs text-subtle">
            The result is aggregated from the matching rules. Open{" "}
            <Link href="/rules" className="text-primary hover:underline">
              Registry Rules
            </Link>{" "}
            to fix the rule driving the wrong outcome.
          </p>
        )}
      </div>
    </Dialog>
  );
}

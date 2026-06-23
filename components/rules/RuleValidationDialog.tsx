"use client";

import { useState } from "react";
import Link from "next/link";
import { validateAllRules } from "@/app/rules/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { OUTCOME_LABELS } from "@/lib/eligibility/constants";
import type { Rule } from "@/lib/eligibility/types";
import type { RegistryValidation } from "@/lib/rules/validation";
import { display, stateScope } from "./rule-helpers";

/** Compact one-line summary of a rule's matching criteria. */
function criteria(rule: Rule): string {
  return [
    display(rule.payer_group),
    display(rule.plan_type),
    display(rule.plan_structure),
    stateScope(rule.service_state),
  ].join(" · ");
}

function RuleChip({ rule }: { rule: Rule }) {
  return (
    <Link
      href={`/rules/${rule.id}`}
      className="focus-ring block rounded-lg border border-line bg-cream/50 px-3 py-2 transition-colors hover:border-secondary/50 hover:bg-filler/40"
    >
      <span className="type-label-xs text-ink">{criteria(rule)}</span>
    </Link>
  );
}

/**
 * Audits the whole registry on demand and reports duplicate and conflicting
 * rules in a modal. Reuses the same detection core (`validateRegistry`) as the
 * add/edit verify-step warnings.
 */
export function RuleValidationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistryValidation | null>(null);

  async function run() {
    setLoading(true);
    try {
      const r = await validateAllRules();
      setResult(r);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const clean =
    result && result.conflicts.length === 0 && result.duplicates.length === 0;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={run} disabled={loading}>
        {loading ? "Validating…" : "Validate rules"}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Rule validation"
        character={result ? (clean ? "ines" : "caleb") : undefined}
        maxWidthClass="max-w-2xl"
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        {!result ? null : clean ? (
          <p className="text-center text-ink">
            No conflicts or duplicates found across the registry.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {result.conflicts.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="type-title-h6 text-ink">Conflicts</h3>
                  <Badge tone="danger">{result.conflicts.length}</Badge>
                </div>
                <p className="type-body-sm text-muted">
                  These rules share the exact same match criteria but disagree on
                  outcomes — the same inputs can't have two answers.
                </p>
                <ul className="flex flex-col gap-3">
                  {result.conflicts.map((c, i) => (
                    <li
                      key={`${c.a.id}-${c.b.id}-${i}`}
                      className="rounded-xl border border-line p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <RuleChip rule={c.a} />
                        <RuleChip rule={c.b} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="type-body-sm text-muted">
                          Disagrees on:
                        </span>
                        {c.outcomes.map((k) => (
                          <Badge key={k} tone="warning">
                            {OUTCOME_LABELS[k]}
                          </Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.duplicates.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="type-title-h6 text-ink">Duplicates</h3>
                  <Badge tone="warning">{result.duplicates.length}</Badge>
                </div>
                <p className="type-body-sm text-muted">
                  Each group shares identical matching criteria — redundant rules
                  that always match together.
                </p>
                <ul className="flex flex-col gap-3">
                  {result.duplicates.map((group, i) => (
                    <li
                      key={`dup-${i}`}
                      className="rounded-xl border border-line p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.map((rule) => (
                          <RuleChip key={rule.id} rule={rule} />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}

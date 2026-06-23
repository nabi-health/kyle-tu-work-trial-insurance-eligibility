"use client";

import { useMemo, useState } from "react";
import { saveRule, deleteRuleAction } from "@/app/rules/actions";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  display,
  ruleChanges,
  stateScope,
  stripId,
} from "@/components/rules/rule-helpers";
import { useUser } from "@/components/user/UserProvider";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import { detectWarnings } from "@/lib/rules/validation";
import type {
  BulkRuleOp,
  BulkRuleProposal,
  ProposalResolution,
} from "@/lib/chat/types";
import type { Rule, RuleFields } from "@/lib/eligibility/types";

const MODE_BADGE: Record<BulkRuleOp["mode"], { label: string; tone: Tone }> = {
  create: { label: "New", tone: "success" },
  edit: { label: "Edit", tone: "neutral" },
  delete: { label: "Delete", tone: "danger" },
};

/** Compact "Aetna · Commercial · PPO · CA" identity from a rule's fields. */
function criteriaLabel(f: RuleFields): string {
  return [
    display(f.payer_group),
    display(f.plan_type),
    display(f.plan_structure),
    stateScope(f.service_state),
  ].join(" · ");
}

/**
 * Renders a batch of proposed rule changes (create/edit/delete) as one
 * confirmable card. Reuses the single-rule visual language (criteria labels,
 * field-level diffs, same-criteria warnings). The user can exclude individual
 * ops before confirming; Confirm applies every included op via the existing
 * `saveRule` / `deleteRuleAction` server actions.
 */
export function BulkRuleProposalCard({
  proposal,
  rules,
  resolution,
  onResolved,
}: {
  proposal: BulkRuleProposal;
  rules: Rule[];
  resolution?: ProposalResolution;
  onResolved: (resolution: ProposalResolution) => void;
}) {
  const { name } = useUser();
  const { ops } = proposal;

  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);

  // Same-criteria collisions against the live registry, per op (create/edit).
  const warningsByOp = useMemo(
    () =>
      ops.map((op) =>
        op.fields
          ? detectWarnings(op.fields, rules, op.target_rule_id).map((w) => w.message)
          : [],
      ),
    [ops, rules],
  );
  const flagged = warningsByOp.filter((w) => w.length > 0).length;

  function toggle(i: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const includedCount = ops.length - excluded.size;

  async function confirm() {
    setSaving(true);
    const fails: string[] = [];
    for (let i = 0; i < ops.length; i++) {
      if (excluded.has(i)) continue;
      const op = ops[i];
      try {
        if (op.mode === "delete") {
          if (op.target_rule_id) await deleteRuleAction(op.target_rule_id);
        } else if (op.fields) {
          const res = await saveRule(
            op.fields,
            op.mode === "edit" ? op.target_rule_id : undefined,
            name,
          );
          if (!res.ok) {
            fails.push(`Rule ${i + 1}: ${res.formError ?? "couldn't be saved."}`);
          }
        }
      } catch {
        fails.push(`Rule ${i + 1}: an unexpected error occurred.`);
      }
    }
    setFailures(fails);
    setSaving(false);
    onResolved("confirmed");
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <p className="type-subhead-2xs text-muted">Proposed bulk change</p>
          <h3 className="type-title-h6 text-ink">
            {ops.length} rule operation{ops.length === 1 ? "" : "s"}
          </h3>
        </div>
        {resolution === "confirmed" && (
          <Badge tone="success" dot>
            Applied
          </Badge>
        )}
        {resolution === "discarded" && <Badge tone="neutral">Discarded</Badge>}
      </CardHeader>

      <CardBody className="flex flex-col gap-4">
        {proposal.rationale.trim() && (
          <p className="type-body-sm text-muted">{proposal.rationale}</p>
        )}

        {!resolution && flagged > 0 && (
          <div className="rounded-xl bg-warning-bg px-4 py-3">
            <p className="type-body-sm text-warning">
              ⚠ {flagged} of {ops.length} change{ops.length === 1 ? "" : "s"} collide
              with an existing rule. Review before applying.
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {ops.map((op, i) => (
            <OpRow
              key={i}
              op={op}
              rules={rules}
              warnings={warningsByOp[i]}
              excluded={excluded.has(i)}
              readOnly={!!resolution}
              onToggle={() => toggle(i)}
            />
          ))}
        </ul>

        {failures.length > 0 && (
          <div className="rounded-xl bg-danger-bg/60 px-4 py-3">
            <p className="type-label-sm text-ink">
              {failures.length} operation{failures.length === 1 ? "" : "s"} failed:
            </p>
            <ul className="mt-1 type-body-xs text-danger">
              {failures.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {!resolution && (
          <div className="flex items-center gap-2">
            <Button onClick={confirm} disabled={saving || includedCount === 0}>
              {saving
                ? "Applying…"
                : `Confirm & apply ${includedCount} change${includedCount === 1 ? "" : "s"}`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onResolved("discarded")}
              disabled={saving}
            >
              Discard
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** One operation row: mode badge, criteria, a diff (edit) or outcomes (create). */
function OpRow({
  op,
  rules,
  warnings,
  excluded,
  readOnly,
  onToggle,
}: {
  op: BulkRuleOp;
  rules: Rule[];
  warnings: string[];
  excluded: boolean;
  readOnly: boolean;
  onToggle: () => void;
}) {
  const target = op.target_rule_id
    ? rules.find((r) => r.id === op.target_rule_id)
    : undefined;
  const before: RuleFields | null = target ? stripId(target) : null;
  const after = op.fields ?? null;
  const badge = MODE_BADGE[op.mode];
  const label = after
    ? criteriaLabel(after)
    : target
      ? criteriaLabel(stripId(target))
      : "Unknown rule";
  const changes = op.mode === "edit" && before && after ? ruleChanges(before, after) : [];

  return (
    <li
      className={
        "rounded-xl ring-1 ring-line px-4 py-3 " +
        (excluded ? "opacity-50" : "bg-surface")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <span className="truncate type-label-sm text-ink">{label}</span>
          </div>

          {op.mode === "delete" && (
            <p className="type-body-xs text-muted">This rule will be removed.</p>
          )}

          {op.mode === "create" && after && (
            <div className="flex flex-wrap gap-1.5">
              {OUTCOME_KEYS.map((k) => (
                <Badge key={k} tone={outcomeTone(k, after[k])}>
                  {OUTCOME_LABELS[k]}: {display(after[k])}
                </Badge>
              ))}
            </div>
          )}

          {op.mode === "edit" && (
            <ul className="flex flex-col gap-0.5">
              {changes.length === 0 ? (
                <li className="type-body-xs text-subtle">No field changes.</li>
              ) : (
                changes.map((c) => (
                  <li key={c.label} className="type-body-xs text-ink">
                    <span className="text-subtle">{c.label}:</span>{" "}
                    <span className="text-muted line-through">{c.from}</span>{" "}
                    <span aria-hidden>→</span>{" "}
                    <span className="font-medium">{c.to}</span>
                  </li>
                ))
              )}
            </ul>
          )}

          {warnings.map((w, i) => (
            <p key={i} className="type-body-xs text-warning">
              ⚠ {w}
            </p>
          ))}
        </div>

        {!readOnly && (
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 type-body-xs text-subtle">
            <input type="checkbox" checked={excluded} onChange={onToggle} />
            Skip
          </label>
        )}
      </div>
    </li>
  );
}

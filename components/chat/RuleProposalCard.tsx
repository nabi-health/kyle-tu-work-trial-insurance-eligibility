"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  checkRegistryWithCandidate,
  previewRule,
  saveRule,
  type PreviewResult,
  type RegistryCheck,
} from "@/app/rules/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RegistryCheckBanner } from "@/components/rules/RegistryCheckBanner";
import { SummaryPanel } from "@/components/rules/RuleSummary";
import { EMPTY, ruleChanges, stripId } from "@/components/rules/rule-helpers";
import { useUser } from "@/components/user/UserProvider";
import type { ProposalResolution, RuleProposal } from "@/lib/chat/types";
import type { RuleFields, Rule } from "@/lib/eligibility/types";

/**
 * Renders a proposed rule change inside the chat thread: a before/after preview,
 * a field-level diff (for edits), and a live registry conflict check. The user
 * confirms (which saves via the existing `saveRule` action) or discards. This is
 * the verification/preview stage — nothing is written until Confirm.
 *
 * Reuses the same machinery as the form-based verify flow (RuleVerifyCard).
 */
export function RuleProposalCard({
  proposal,
  rules,
  resolution,
  savedRuleId,
  onResolved,
}: {
  proposal: RuleProposal;
  rules: Rule[];
  resolution?: ProposalResolution;
  savedRuleId?: string;
  onResolved: (resolution: ProposalResolution, savedRuleId?: string) => void;
}) {
  const { name } = useUser();

  const target =
    proposal.mode === "edit" && proposal.target_rule_id
      ? rules.find((r) => r.id === proposal.target_rule_id)
      : undefined;
  const before: RuleFields = target ? stripId(target) : EMPTY;
  const after = proposal.fields;
  const changes = ruleChanges(before, after);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [check, setCheck] = useState<RegistryCheck | null>(null);
  const [checking, setChecking] = useState(!resolution);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once resolved (confirmed/discarded) the card is read-only — skip the checks.
  useEffect(() => {
    if (resolution) return;
    let cancelled = false;
    Promise.all([
      previewRule(after, proposal.target_rule_id),
      checkRegistryWithCandidate(after, proposal.target_rule_id),
    ]).then(([p, c]) => {
      if (cancelled) return;
      setPreview(p);
      setCheck(c);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution]);

  async function confirm() {
    setSaving(true);
    setError(null);
    const result = await saveRule(after, proposal.target_rule_id, name);
    if (result.ok) {
      onResolved("confirmed", result.id);
    } else {
      setSaving(false);
      setError(result.formError ?? "Couldn't save this rule. Please try again.");
    }
  }

  const warnings = preview && preview.ok ? preview.warnings : [];
  const isEdit = proposal.mode === "edit";

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <p className="type-subhead-2xs text-muted">
            {isEdit ? "Proposed edit" : "Proposed new rule"}
          </p>
          <h3 className="type-title-h6 text-ink">Review before saving</h3>
        </div>
        {resolution === "confirmed" && (
          <Badge tone="success" dot>
            Saved
          </Badge>
        )}
        {resolution === "discarded" && <Badge tone="neutral">Discarded</Badge>}
      </CardHeader>

      <CardBody className="flex flex-col gap-5">
        {proposal.rationale.trim() && (
          <p className="type-body-sm text-muted">{proposal.rationale}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryPanel label={isEdit ? "Before" : "New rule"} data={before} />
          <SummaryPanel label="After" accent data={after} />
        </div>

        {isEdit && changes.length > 0 && (
          <div className="rounded-xl bg-cream px-4 py-3 ring-1 ring-line">
            <p className="mb-2 type-subhead-2xs text-subtle">
              Changes ({changes.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {changes.map((c) => (
                <li key={c.label} className="type-body-sm text-ink">
                  <span className="text-subtle">{c.label}:</span>{" "}
                  <span className="text-muted line-through">{c.from}</span>{" "}
                  <span aria-hidden>→</span>{" "}
                  <span className="font-medium">{c.to}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!resolution && (
          <>
            <RegistryCheckBanner check={check} loading={checking} />

            {warnings.length > 0 && (
              <div className="rounded-xl bg-warning-bg px-4 py-3">
                {warnings.map((w, i) => (
                  <p key={i} className="type-body-sm text-warning">
                    ⚠ {w.message}
                  </p>
                ))}
              </div>
            )}

            {error && <p className="type-body-sm text-danger">{error}</p>}

            <div className="flex items-center gap-2">
              <Button onClick={confirm} disabled={saving || checking}>
                {saving ? "Saving…" : "Confirm & save"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => onResolved("discarded")}
                disabled={saving}
              >
                Discard
              </Button>
            </div>
          </>
        )}

        {resolution === "confirmed" && savedRuleId && (
          <Link
            href={`/rules/${savedRuleId}`}
            className="focus-ring inline-flex w-fit items-center gap-1 rounded-lg type-label-sm text-primary hover:underline"
          >
            View saved rule →
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

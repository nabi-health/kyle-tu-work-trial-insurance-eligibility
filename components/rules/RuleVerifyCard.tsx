"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkRegistryWithCandidate,
  checkTestsWithCandidate,
  saveRule,
  type RegistryCheck,
  type TestImpact,
} from "@/app/rules/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useUser } from "@/components/user/UserProvider";
import { useRuleDraft } from "./RuleDraftProvider";
import { ConflictConfirmDialog } from "./ConflictConfirmDialog";
import { RegistryCheckBanner } from "./RegistryCheckBanner";
import { TestImpactBanner } from "./TestImpactBanner";
import { SummaryPanel } from "./RuleSummary";
import { stripId } from "./rule-helpers";

/**
 * Before/after review of a pending edit. Reads the validated draft from context;
 * if there's none (e.g. the route was opened directly), it bounces back to edit.
 */
export function RuleVerifyCard() {
  const router = useRouter();
  const d = useRuleDraft();
  const { name } = useUser();
  const verified = d.preview && d.preview.ok ? d.preview : null;

  const [check, setCheck] = useState<RegistryCheck | null>(null);
  const [checking, setChecking] = useState(true);
  const [impact, setImpact] = useState<TestImpact | null>(null);
  const [testing, setTesting] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!verified) router.replace(`/rules/${d.ruleId}/edit`);
  }, [verified, router, d.ruleId]);

  // Validate the registry as it would be after this save.
  useEffect(() => {
    if (!verified) return;
    let cancelled = false;
    setChecking(true);
    checkRegistryWithCandidate(verified.data, d.ruleId).then((result) => {
      if (!cancelled) {
        setCheck(result);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [verified, d.ruleId]);

  // Re-run the saved eligibility tests against the prospective registry.
  useEffect(() => {
    if (!verified) return;
    let cancelled = false;
    setTesting(true);
    checkTestsWithCandidate(verified.data, d.ruleId).then((result) => {
      if (!cancelled) {
        setImpact(result);
        setTesting(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [verified, d.ruleId]);

  if (!verified) return null;

  const before = stripId(d.rule);
  const after = verified.data;
  const hasIssues =
    (!!check && check.failing > 0) || (!!impact && impact.failing > 0);

  function onSaveClick() {
    // Failing registry checks / tests are non-blocking, but make the user confirm.
    if (hasIssues) setConfirmOpen(true);
    else doSave();
  }

  async function doSave() {
    setConfirmOpen(false);
    d.setSaving(true);
    const result = await saveRule(after, d.ruleId, name);
    if (result.ok) {
      router.push(`/rules/${result.id}`);
      router.refresh();
    } else {
      d.setSaving(false);
      d.setErrors(result.errors);
      router.push(`/rules/${d.ruleId}/edit`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Card>
        <CardHeader>
          <p className="type-subhead-2xs text-muted">Verify before saving</p>
          <h2 className="type-title-h6 text-ink">Review this rule</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryPanel label="Before" data={before} />
            <SummaryPanel label="After" accent data={after} />
          </div>

          <RegistryCheckBanner check={check} loading={checking} />

          <TestImpactBanner impact={impact} loading={testing} />

          {verified.warnings.length > 0 && (
            <div className="rounded-xl bg-warning-bg px-4 py-3">
              {verified.warnings.map((w, i) => (
                <p key={i} className="type-body-sm text-warning">
                  ⚠ {w.message}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={onSaveClick} disabled={d.saving}>
              {d.saving ? "Saving…" : "Confirm & save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push(`/rules/${d.ruleId}/edit`)}
            >
              Back to edit
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConflictConfirmDialog
        open={confirmOpen}
        check={check}
        testImpact={impact}
        saving={d.saving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSave}
      />
    </div>
  );
}

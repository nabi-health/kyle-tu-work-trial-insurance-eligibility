"use client";

import type { RegistryCheck, TestImpact } from "@/app/rules/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

function issues(check: RegistryCheck): string {
  const parts: string[] = [];
  if (check.conflicts.length) {
    parts.push(
      `${check.conflicts.length} conflict${check.conflicts.length > 1 ? "s" : ""}`,
    );
  }
  if (check.duplicates.length) {
    parts.push(
      `${check.duplicates.length} duplicate group${
        check.duplicates.length > 1 ? "s" : ""
      }`,
    );
  }
  return parts.join(" and ");
}

/**
 * Confirms a save that leaves the registry with conflicts/duplicates and/or
 * would break one or more saved eligibility tests.
 */
export function ConflictConfirmDialog({
  open,
  check,
  testImpact,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  check: RegistryCheck | null;
  testImpact?: TestImpact | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const hasRegistryIssues = !!check && check.failing > 0;
  const failingTests = testImpact && testImpact.failing > 0 ? testImpact : null;
  const title = hasRegistryIssues
    ? "Save despite conflicts?"
    : "Save despite failing tests?";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      character="caleb"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save anyway"}
          </Button>
        </>
      }
    >
      {hasRegistryIssues && (
        <>
          <p className="text-ink">
            {check
              ? `This save leaves the registry with ${issues(check)}.`
              : "This change leaves the registry with unresolved issues."}
          </p>
          <p className="mt-2">
            Where rules overlap but disagree, eligibility checks don&apos;t
            error — aggregation silently picks a winner, so a check can return a
            wrong or ambiguous answer without anyone noticing.
          </p>
        </>
      )}

      {failingTests && (
        <p className={hasRegistryIssues ? "mt-3 text-ink" : "text-ink"}>
          This save breaks {failingTests.failing} eligibility test
          {failingTests.failing > 1 ? "s" : ""}:{" "}
          {failingTests.failures.map((f) => f.name).join(", ")}.
        </p>
      )}

      <p className="mt-2 font-medium text-ink">Save this rule anyway?</p>
    </Dialog>
  );
}

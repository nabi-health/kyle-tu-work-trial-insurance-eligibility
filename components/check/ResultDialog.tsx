"use client";

import { Dialog } from "@/components/ui/Dialog";
import type { EligibilityResult } from "@/lib/eligibility/types";
import { ResultCard } from "./ResultCard";

/**
 * Modal wrapper around the full single-check ResultCard, used to drill into one
 * row of the bulk results table. Wide panel since ResultCard is a rich layout.
 */
export function ResultDialog({
  result,
  onClose,
}: {
  result: EligibilityResult | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={result !== null}
      onClose={onClose}
      title="Eligibility detail"
      maxWidthClass="max-w-3xl"
    >
      {result && <ResultCard result={result} />}
    </Dialog>
  );
}

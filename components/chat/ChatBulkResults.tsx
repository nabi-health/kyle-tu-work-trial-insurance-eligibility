"use client";

import { useMemo, useState } from "react";
import {
  BulkResultsTable,
  type IndexedResult,
} from "@/components/check/BulkResultsTable";
import { ResultDialog } from "@/components/check/ResultDialog";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { resultsToCsv } from "@/lib/check/export";
import type { EligibilityResult } from "@/lib/eligibility/types";

/** Trigger a client-side file download from in-memory text. */
function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders a bulk eligibility check's results inline in the chat thread — the
 * same table + drill-in dialog the standalone sandbox uses, plus a CSV export.
 * Pure reuse of `BulkResultsTable` / `ResultDialog`.
 */
export function ChatBulkResults({ results }: { results: EligibilityResult[] }) {
  const [openResult, setOpenResult] = useState<EligibilityResult | null>(null);
  const indexed = useMemo<IndexedResult[]>(
    () => results.map((result, id) => ({ id, result })),
    [results],
  );

  if (results.length === 0) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <p className="type-subhead-2xs text-muted">Bulk eligibility check</p>
          <h3 className="type-title-h6 text-ink">
            {results.length} result{results.length === 1 ? "" : "s"}
          </h3>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            download(
              "eligibility-results.csv",
              resultsToCsv(results),
              "text/csv",
            )
          }
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardBody>
        <BulkResultsTable results={indexed} onRowClick={setOpenResult} />
      </CardBody>
      <ResultDialog result={openResult} onClose={() => setOpenResult(null)} />
    </Card>
  );
}

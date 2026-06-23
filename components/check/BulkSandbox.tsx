"use client";

import { useRef, useState, useTransition } from "react";
import { checkEligibilityBatch, generateSampleResults } from "@/app/check/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { resultsToCsv } from "@/lib/check/export";
import { csvTemplate, jsonTemplate } from "@/lib/check/template";
import { readQueryFile } from "@/lib/check/upload";
import type { RowError } from "@/lib/check/validation";
import type { EligibilityResult } from "@/lib/eligibility/types";
import { BulkResultsTable, type IndexedResult } from "./BulkResultsTable";
import { ResultDialog } from "./ResultDialog";

/** Trigger a client-side file download from in-memory text. */
function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkSandbox() {
  const [results, setResults] = useState<IndexedResult[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [openResult, setOpenResult] = useState<EligibilityResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileError(null);
    setRowErrors([]);
    setResults([]);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later by clearing the input value.
    e.target.value = "";
    if (!file) return;
    reset();

    const res = await readQueryFile(file);
    if (!res.ok) {
      if (res.fileError) setFileError(res.fileError);
      else if (res.rowErrors) setRowErrors(res.rowErrors);
      return;
    }

    startTransition(async () => {
      const out = await checkEligibilityBatch(res.queries);
      setResults(out.map((result, id) => ({ id, result })));
    });
  }

  function generateSamples() {
    reset();
    startTransition(async () => {
      const out = await generateSampleResults(25);
      setResults(out.map((result, id) => ({ id, result })));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4">
            <div>
              <p className="type-label-sm text-ink">Bulk check</p>
              <p className="mt-1 type-body-sm text-muted">
                Upload a CSV or JSON of patient inputs to run them all at once.
                Need the shape? Download a template to start from.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  download("eligibility-template.csv", csvTemplate(), "text/csv")
                }
              >
                Download CSV template
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  download(
                    "eligibility-template.json",
                    jsonTemplate(),
                    "application/json",
                  )
                }
              >
                Download JSON template
              </Button>
            </div>

            <Field
              label="Upload file"
              htmlFor="bulk-file"
              error={fileError ?? undefined}
              hint="Columns: payer_group, plan_type, plan_structure, service_state"
            >
              <input
                ref={inputRef}
                id="bulk-file"
                type="file"
                accept=".csv,.json"
                onChange={onFile}
                className="block w-full type-body-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-row-selected"
              />
            </Field>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="type-body-xs text-subtle">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={generateSamples}
                disabled={pending}
              >
                Generate 25 examples
              </Button>
              <span className="type-body-xs text-subtle">
                Random patients drawn from real registry rules.
              </span>
            </div>

            {pending && (
              <p className="type-body-sm text-muted">Running checks…</p>
            )}

            {rowErrors.length > 0 && (
              <div className="rounded-xl border border-danger/30 bg-danger-bg/60 px-4 py-3">
                <p className="type-label-sm text-ink">
                  File rejected — {rowErrors.length} problem
                  {rowErrors.length > 1 ? "s" : ""} found. Fix the source and
                  re-upload.
                </p>
                <ul className="mt-2 max-h-48 overflow-y-auto type-body-xs text-muted">
                  {rowErrors.slice(0, 50).map((er, i) => (
                    <li key={i}>
                      Line {er.row} · {er.column}: {er.message}
                    </li>
                  ))}
                </ul>
                {rowErrors.length > 50 && (
                  <p className="mt-1 type-body-xs text-subtle">
                    Showing first 50 of {rowErrors.length}.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="type-label-sm text-ink">
              {results.length} result{results.length > 1 ? "s" : ""}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                download(
                  "eligibility-results.csv",
                  resultsToCsv(results.map((r) => r.result)),
                  "text/csv",
                )
              }
            >
              Export results CSV
            </Button>
          </div>
          <BulkResultsTable results={results} onRowClick={setOpenResult} />
        </div>
      )}

      <ResultDialog result={openResult} onClose={() => setOpenResult(null)} />
    </div>
  );
}

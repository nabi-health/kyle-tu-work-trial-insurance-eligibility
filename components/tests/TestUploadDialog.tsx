"use client";

import { useRef, useState, useTransition } from "react";
import { uploadTests } from "@/app/check/tests/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import {
  csvTestTemplate,
  jsonTestTemplate,
  parseTestCsv,
} from "@/lib/tests/upload";
import type { RowError } from "@/lib/tests/validation";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Trigger a client-side file download from in-memory text. */
function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Upload a CSV/JSON of test cases. Server-validated; the batch is all-or-nothing. */
export function TestUploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (created: number) => void;
}) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileError(null);
    setRowErrors([]);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    reset();

    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isJson = name.endsWith(".json");
    if (!isCsv && !isJson) {
      setFileError("Upload a .csv or .json file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("File is too large (max 2 MB).");
      return;
    }

    const text = await file.text();

    let rawRows: unknown[];
    if (isJson) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setFileError("Invalid JSON syntax.");
        return;
      }
      if (!Array.isArray(parsed)) {
        setFileError("JSON must be an array of test objects.");
        return;
      }
      rawRows = parsed;
    } else {
      const res = parseTestCsv(text);
      if (!res.success) {
        setFileError(res.error);
        return;
      }
      rawRows = res.rows;
    }

    startTransition(async () => {
      const result = await uploadTests(rawRows);
      if (result.ok) {
        onUploaded(result.created);
        onClose();
      } else {
        const fileLevel = result.errors.find((er) => er.row === 0);
        if (fileLevel) setFileError(fileLevel.message);
        else setRowErrors(result.errors);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload test cases"
      maxWidthClass="max-w-xl"
      footer={
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="type-body-sm text-muted">
          Upload a CSV or JSON of test cases — the four inputs plus the four
          expected outputs. Need the shape? Download a template pre-filled with
          the starting cases.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              download("eligibility-tests-template.csv", csvTestTemplate(), "text/csv")
            }
          >
            Download CSV template
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              download(
                "eligibility-tests-template.json",
                jsonTestTemplate(),
                "application/json",
              )
            }
          >
            Download JSON template
          </Button>
        </div>

        <Field
          label="Upload file"
          htmlFor="test-file"
          error={fileError ?? undefined}
          hint="Columns: name, payer_group, plan_type, plan_structure, service_state, expected_serviceable, expected_pre_auth_required, expected_referral_required, expected_preventative_coverage, notes"
        >
          <input
            ref={inputRef}
            id="test-file"
            type="file"
            accept=".csv,.json"
            onChange={onFile}
            className="block w-full type-body-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-row-selected"
          />
        </Field>

        {pending && <p className="type-body-sm text-muted">Uploading…</p>}

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
    </Dialog>
  );
}

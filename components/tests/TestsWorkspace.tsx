"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTestAction } from "@/app/check/tests/actions";
import { Button } from "@/components/ui/Button";
import { testsToCsv } from "@/lib/tests/upload";
import type {
  EligibilityTest,
  TestRunResult,
  TestRunSummary,
} from "@/lib/tests/types";
import { TestDetailDialog } from "./TestDetailDialog";
import { TestEditDialog } from "./TestEditDialog";
import { TestResultsTable } from "./TestResultsTable";
import { TestUploadDialog } from "./TestUploadDialog";

/** Trigger a client-side file download from in-memory text. */
function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Summary headline: green when all pass, amber when any fail, neutral if empty. */
function SummaryBanner({ summary }: { summary: TestRunSummary }) {
  if (summary.total === 0) {
    return (
      <div className="rounded-xl bg-cream px-4 py-3 ring-1 ring-line">
        <p className="type-body-sm text-muted">
          No test cases yet. Add one or upload a CSV/JSON to lock in expected
          outcomes.
        </p>
      </div>
    );
  }
  if (summary.failing === 0) {
    return (
      <div className="rounded-xl bg-success-bg px-4 py-3">
        <p className="type-label-sm text-success">
          ✓ All {summary.passing} test{summary.passing > 1 ? "s" : ""} pass
          against the current registry
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-danger-bg px-4 py-3">
      <p className="type-label-sm text-danger">
        ✕ {summary.failing} of {summary.total} test
        {summary.total > 1 ? "s" : ""} failing — a rule change broke an expected
        outcome. Review the red rows below.
      </p>
    </div>
  );
}

/**
 * The Eligibility tests page body: a pass/fail summary, the results table, and
 * the add / edit / upload / export controls. The runs are computed on the server
 * against the live registry; mutations refresh the route to recompute.
 */
export function TestsWorkspace({
  runs,
  summary,
  payerGroups,
}: {
  runs: TestRunResult[];
  summary: TestRunSummary;
  payerGroups: string[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editTest, setEditTest] = useState<EligibilityTest | null>(null);
  const [detailRun, setDetailRun] = useState<TestRunResult | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  function openAdd() {
    setEditTest(null);
    setEditOpen(true);
  }

  function openEdit(test: EligibilityTest) {
    setDetailRun(null);
    setEditTest(test);
    setEditOpen(true);
  }

  function onDelete() {
    if (!detailRun) return;
    const id = detailRun.test.id;
    startDelete(async () => {
      await deleteTestAction(id);
      setDetailRun(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SummaryBanner summary={summary} />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {runs.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                download(
                  "eligibility-tests.csv",
                  testsToCsv(runs.map((r) => r.test)),
                  "text/csv",
                )
              }
            >
              Export CSV
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setUploadOpen(true)}>
            Upload CSV/JSON
          </Button>
          <Button size="sm" onClick={openAdd}>
            Add test
          </Button>
        </div>
      </div>

      <TestResultsTable runs={runs} onRowClick={setDetailRun} />

      <TestEditDialog
        open={editOpen}
        test={editTest}
        payerGroups={payerGroups}
        onClose={() => setEditOpen(false)}
        onSaved={() => router.refresh()}
      />

      <TestDetailDialog
        run={detailRun}
        deleting={deleting}
        onClose={() => setDetailRun(null)}
        onEdit={() => detailRun && openEdit(detailRun.test)}
        onDelete={onDelete}
      />

      <TestUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => router.refresh()}
      />
    </div>
  );
}

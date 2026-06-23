import Link from "next/link";
import type { TestImpact } from "@/app/rules/actions";

/** How many failing tests to list before collapsing. */
const CAP = 5;

/**
 * Eligibility-test impact for a prospective save: "X of Y tests still pass".
 * Green when the change keeps every expectation intact; red when it would break
 * one, listing the offending cases and the columns that flip. Renders nothing
 * when there are no saved tests (the check returns null).
 */
export function TestImpactBanner({
  impact,
  loading,
}: {
  impact: TestImpact | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl bg-cream px-4 py-3 ring-1 ring-line">
        <p className="type-body-sm text-muted">Running eligibility tests…</p>
      </div>
    );
  }
  if (!impact) return null;

  if (impact.failing === 0) {
    return (
      <div className="rounded-xl bg-success-bg px-4 py-3">
        <p className="type-label-sm text-success">
          ✓ {impact.passing} of {impact.total} eligibility test
          {impact.total > 1 ? "s" : ""} still pass with this change
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-danger-bg px-4 py-3">
      <p className="type-label-sm text-danger">
        ✕ {impact.failing} of {impact.total} eligibility test
        {impact.total > 1 ? "s" : ""} would fail with this change
      </p>
      <ul className="flex flex-col gap-2">
        {impact.failures.slice(0, CAP).map((f) => (
          <li key={f.id} className="flex flex-col gap-1">
            <span className="type-label-xs text-ink">{f.name}</span>
            <span className="flex flex-wrap gap-1.5">
              {f.mismatches.map((m) => (
                <span
                  key={m.label}
                  className="rounded-md bg-danger/10 px-1.5 py-0.5 type-body-xs text-danger"
                >
                  {m.label}: expected {m.expected}, got {m.actual}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {impact.failures.length > CAP && (
        <p className="type-body-xs text-muted">
          +{impact.failures.length - CAP} more
        </p>
      )}
      <p className="type-body-xs text-danger">
        Saving will break these expectations. Review them on the{" "}
        <Link href="/check/tests" className="underline">
          Eligibility tests
        </Link>{" "}
        page, or adjust the rule.
      </p>
    </div>
  );
}

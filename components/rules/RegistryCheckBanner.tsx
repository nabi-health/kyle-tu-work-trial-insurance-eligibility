import Link from "next/link";
import type { RegistryCheck } from "@/app/rules/actions";
import { OUTCOME_LABELS } from "@/lib/eligibility/constants";
import type { Rule } from "@/lib/eligibility/types";
import { display, stateScope } from "./rule-helpers";

/** How many conflict pairs / duplicate groups to list before collapsing. */
const CAP = 5;

function criteria(rule: Rule): string {
  return [
    display(rule.payer_group),
    display(rule.plan_type),
    display(rule.plan_structure),
    stateScope(rule.service_state),
  ].join(" · ");
}

/** A rule reference — links to its page, or marks the rule being saved. */
function RuleRef({ rule, candidateId }: { rule: Rule; candidateId: string }) {
  if (rule.id === candidateId) {
    return (
      <span className="rounded-md bg-warning/15 px-2 py-1 type-label-xs text-warning">
        This rule · {criteria(rule)}
      </span>
    );
  }
  return (
    <Link
      href={`/rules/${rule.id}`}
      className="focus-ring rounded-md border border-line bg-surface px-2 py-1 type-label-xs text-ink transition-colors hover:border-secondary/50"
    >
      {criteria(rule)}
    </Link>
  );
}

/**
 * Registry health for the prospective save: "X of Y rules pass". Green when the
 * change keeps the registry clean; amber when it leaves conflicts or duplicates,
 * and then it lists the offending rules (the rule being saved is flagged).
 */
export function RegistryCheckBanner({
  check,
  loading,
}: {
  check: RegistryCheck | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl bg-cream px-4 py-3 ring-1 ring-line">
        <p className="type-body-sm text-muted">Checking the registry…</p>
      </div>
    );
  }
  if (!check) return null;

  const ok = check.failing === 0;
  if (ok) {
    return (
      <div className="rounded-xl bg-success-bg px-4 py-3">
        <p className="type-label-sm text-success">
          ✓ {check.passing} of {check.total} rules pass validation
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-warning-bg px-4 py-3">
      <p className="type-label-sm text-warning">
        ⚠ {check.passing} of {check.total} rules pass validation
      </p>

      {check.conflicts.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="type-subhead-2xs text-warning">
            Conflicts ({check.conflicts.length})
          </p>
          <ul className="flex flex-col gap-2">
            {check.conflicts.slice(0, CAP).map((c, i) => (
              <li
                key={`${c.a.id}-${c.b.id}-${i}`}
                className="flex flex-wrap items-center gap-1.5"
              >
                <RuleRef rule={c.a} candidateId={check.candidateId} />
                <span className="type-body-xs text-muted">vs</span>
                <RuleRef rule={c.b} candidateId={check.candidateId} />
                <span className="type-body-xs text-muted">— disagree on</span>
                {c.outcomes.map((k) => (
                  <span
                    key={k}
                    className="rounded-md bg-warning/15 px-1.5 py-0.5 type-body-xs text-warning"
                  >
                    {OUTCOME_LABELS[k]}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {check.conflicts.length > CAP && (
            <p className="type-body-xs text-muted">
              +{check.conflicts.length - CAP} more
            </p>
          )}
        </section>
      )}

      {check.duplicates.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="type-subhead-2xs text-warning">
            Duplicates ({check.duplicates.length})
          </p>
          <ul className="flex flex-col gap-2">
            {check.duplicates.slice(0, CAP).map((group, i) => (
              <li key={`dup-${i}`} className="flex flex-wrap items-center gap-1.5">
                {group.map((rule) => (
                  <RuleRef
                    key={rule.id}
                    rule={rule}
                    candidateId={check.candidateId}
                  />
                ))}
              </li>
            ))}
          </ul>
          {check.duplicates.length > CAP && (
            <p className="type-body-xs text-muted">
              +{check.duplicates.length - CAP} more
            </p>
          )}
        </section>
      )}

      <p className="type-body-xs text-warning">
        Overlapping rules let aggregation silently pick a winner — review before
        saving.
      </p>
    </div>
  );
}

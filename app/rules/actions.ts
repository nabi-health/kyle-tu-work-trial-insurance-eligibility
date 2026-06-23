"use server";

import { revalidatePath } from "next/cache";
import {
  createRule,
  deleteRule,
  listRules,
  updateRule,
} from "@/lib/rules/repository";
import {
  detectWarnings,
  parseRulePayload,
  validateRegistry,
  type RegistryValidation,
  type RuleConflict,
  type RuleWarning,
} from "@/lib/rules/validation";
import { listTests } from "@/lib/tests/repository";
import { runTests } from "@/lib/tests/runner";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import type { Rule, RuleFields } from "@/lib/eligibility/types";

export type PreviewResult =
  | { ok: true; data: RuleFields; warnings: RuleWarning[] }
  | { ok: false; errors: Record<string, string>; formError?: string };

/** Validate + surface non-blocking warnings for the verify step. */
export async function previewRule(
  payload: unknown,
  selfId?: string,
): Promise<PreviewResult> {
  const parsed = parseRulePayload(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.errors, formError: parsed.formError };
  }
  const existing = await listRules();
  return {
    ok: true,
    data: parsed.data,
    warnings: detectWarnings(parsed.data, existing, selfId),
  };
}

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string>; formError?: string };

/**
 * Fallback actor when the client hasn't set a name. There's no auth layer in
 * this tool, so saves are attributed to whoever the browser says they are.
 */
const DEFAULT_ACTOR = "Registry Admin";

/** Validate then create or update a rule, attributing it to `actor`. */
export async function saveRule(
  payload: unknown,
  id?: string,
  actor?: string,
): Promise<SaveResult> {
  const parsed = parseRulePayload(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.errors, formError: parsed.formError };
  }
  // The verification date and author are derived automatically — saving a rule
  // is itself the act of verifying it.
  const data: RuleFields = {
    ...parsed.data,
    last_verified: new Date().toISOString().slice(0, 10),
    verified_by: actor?.trim() || DEFAULT_ACTOR,
  };
  const rule = id
    ? await updateRule(id, data)
    : await createRule(data);

  revalidatePath("/rules");
  revalidatePath("/coverage");
  revalidatePath("/check/tests");
  if (id) revalidatePath(`/rules/${id}`);
  return { ok: true, id: rule.id };
}

/** One outcome column on which a test's expectation no longer holds. */
export type TestMismatch = { label: string; expected: string; actual: string };

/** A test case that would fail if the candidate rule were saved. */
export type TestFailure = { id: string; name: string; mismatches: TestMismatch[] };

/** How the saved eligibility tests fare against a prospective rule change. */
export type TestImpact = {
  total: number;
  passing: number;
  failing: number;
  failures: TestFailure[];
};

/**
 * Run every saved eligibility test against the registry as it WOULD be once
 * `payload` is saved (the candidate replaces the edited rule, or is appended for
 * a create), and report which tests would break. Returns null if the candidate
 * itself doesn't validate, or there are no tests to run.
 */
export async function checkTestsWithCandidate(
  payload: unknown,
  selfId?: string,
): Promise<TestImpact | null> {
  const parsed = parseRulePayload(payload);
  if (!parsed.success) return null;

  const [rules, tests] = await Promise.all([listRules(), listTests()]);
  if (tests.length === 0) return null;

  const candidate: Rule = { ...parsed.data, id: selfId ?? "__candidate__" };
  const prospective = selfId
    ? rules.map((r) => (r.id === selfId ? candidate : r))
    : [...rules, candidate];

  const runs = runTests(tests, prospective);
  const failures: TestFailure[] = runs
    .filter((r) => !r.pass)
    .map((r) => ({
      id: r.test.id,
      name: r.test.name,
      mismatches: OUTCOME_KEYS.filter((k) => !r.checks[k].pass).map((k) => ({
        label: OUTCOME_LABELS[k],
        expected: r.checks[k].expected,
        actual: r.checks[k].actual,
      })),
    }));

  return {
    total: runs.length,
    passing: runs.length - failures.length,
    failing: failures.length,
    failures,
  };
}

/** Audit the entire registry for duplicate and conflicting rules. */
export async function validateAllRules(): Promise<RegistryValidation> {
  const rules = await listRules();
  return validateRegistry(rules);
}

/** How many rules pass the whole-registry audit, plus the offending rules. */
export type RegistryCheck = {
  total: number;
  passing: number;
  failing: number;
  /** The id given to the rule being saved, so the UI can flag it in the lists. */
  candidateId: string;
  /** Conflicting rule pairs (criteria overlap, outcomes disagree). */
  conflicts: RuleConflict[];
  /** Groups of rules sharing identical matching criteria. */
  duplicates: Rule[][];
};

/**
 * Validate the registry as it WOULD be once `payload` is saved — the candidate
 * replaces the edited rule, or is appended for a create — and report how many
 * rules pass (i.e. aren't part of a duplicate group or a conflicting pair).
 * Returns null if the candidate itself doesn't validate.
 */
export async function checkRegistryWithCandidate(
  payload: unknown,
  selfId?: string,
): Promise<RegistryCheck | null> {
  const parsed = parseRulePayload(payload);
  if (!parsed.success) return null;

  const rules = await listRules();
  const candidate: Rule = { ...parsed.data, id: selfId ?? "__candidate__" };
  const prospective = selfId
    ? rules.map((r) => (r.id === selfId ? candidate : r))
    : [...rules, candidate];

  const { duplicates, conflicts } = validateRegistry(prospective);
  const failing = new Set<string>();
  for (const group of duplicates) for (const r of group) failing.add(r.id);
  for (const c of conflicts) {
    failing.add(c.a.id);
    failing.add(c.b.id);
  }

  // Surface issues that involve the rule being saved first — those are the ones
  // the author can act on right now.
  const touchesCandidate = (id: string) => id === candidate.id;
  conflicts.sort(
    (x, y) =>
      Number(touchesCandidate(y.a.id) || touchesCandidate(y.b.id)) -
      Number(touchesCandidate(x.a.id) || touchesCandidate(x.b.id)),
  );
  duplicates.sort(
    (x, y) =>
      Number(y.some((r) => touchesCandidate(r.id))) -
      Number(x.some((r) => touchesCandidate(r.id))),
  );

  return {
    total: prospective.length,
    passing: prospective.length - failing.size,
    failing: failing.size,
    candidateId: candidate.id,
    conflicts,
    duplicates,
  };
}

export async function deleteRuleAction(id: string): Promise<void> {
  await deleteRule(id);
  revalidatePath("/rules");
  revalidatePath("/coverage");
  revalidatePath("/check/tests");
}

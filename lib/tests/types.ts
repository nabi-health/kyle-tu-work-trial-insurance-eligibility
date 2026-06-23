/**
 * Domain types for "Eligibility tests" — saved input → expected-output cases
 * that are re-run against the live registry whenever a rule changes. A test is
 * an {@link EligibilityQuery} paired with the four outcome values it should
 * produce.
 */
import type {
  EligibilityQuery,
  EligibilityResult,
  OutcomeKey,
} from "@/lib/eligibility/types";

/** The expected value for each of the four outcome columns. */
export type ExpectedOutcomes = Record<OutcomeKey, string>;

/** What the author/upload supplies (no identity — the DB owns the id). */
export interface EligibilityTestInput {
  /** Human label for the case, e.g. "Happy Path — Serviceable". */
  name: string;
  payer_group: string;
  plan_type: string;
  plan_structure: string;
  service_state: string;
  /** Expected value per outcome column. */
  expected: ExpectedOutcomes;
  /** Optional rationale ("Why") for the case. */
  notes: string;
}

/** A stored test case. */
export interface EligibilityTest extends EligibilityTestInput {
  id: string;
}

/** Expected vs. actual for a single outcome column. */
export interface OutcomeCheck {
  expected: string;
  actual: string;
  pass: boolean;
}

/** The outcome of running one test against the current registry. */
export interface TestRunResult {
  test: EligibilityTest;
  /** The full engine evaluation (so the UI can show drivers / decision). */
  result: EligibilityResult;
  /** Per-column expected/actual/pass. */
  checks: Record<OutcomeKey, OutcomeCheck>;
  /** True only when every outcome column matches. */
  pass: boolean;
}

/** Roll-up across a set of test runs. */
export interface TestRunSummary {
  total: number;
  passing: number;
  failing: number;
}

/** The four inputs of a test, as an {@link EligibilityQuery}. */
export function testQuery(test: EligibilityTestInput): EligibilityQuery {
  return {
    payer_group: test.payer_group,
    plan_type: test.plan_type,
    plan_structure: test.plan_structure,
    service_state: test.service_state,
  };
}

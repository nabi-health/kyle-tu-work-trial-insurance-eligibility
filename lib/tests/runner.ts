/**
 * Pure test runner. Given the saved test cases and the current ruleset, runs
 * each query through the eligibility engine and compares every outcome column to
 * its expected value. No I/O — the same function backs the server action, the
 * rule-save impact check, and the unit tests.
 */
import { evaluate } from "@/lib/eligibility/engine";
import { OUTCOME_KEYS } from "@/lib/eligibility/constants";
import type { OutcomeKey, Rule } from "@/lib/eligibility/types";
import {
  testQuery,
  type EligibilityTest,
  type OutcomeCheck,
  type TestRunResult,
  type TestRunSummary,
} from "./types";

/** Outcome values compare case-insensitively, ignoring surrounding space. */
const norm = (v: string) => v.trim().toLowerCase();

/** Run one test against `rules`. */
export function runTest(test: EligibilityTest, rules: Rule[]): TestRunResult {
  const result = evaluate(testQuery(test), rules);

  const checks = Object.fromEntries(
    OUTCOME_KEYS.map((key): [OutcomeKey, OutcomeCheck] => {
      const expected = test.expected[key] ?? "";
      const actual = result.outcomes[key].value;
      return [key, { expected, actual, pass: norm(expected) === norm(actual) }];
    }),
  ) as Record<OutcomeKey, OutcomeCheck>;

  const pass = OUTCOME_KEYS.every((k) => checks[k].pass);
  return { test, result, checks, pass };
}

/** Run every test against `rules`. */
export function runTests(
  tests: EligibilityTest[],
  rules: Rule[],
): TestRunResult[] {
  return tests.map((t) => runTest(t, rules));
}

/** Pass/fail roll-up for a set of run results. */
export function summarize(results: TestRunResult[]): TestRunSummary {
  const passing = results.filter((r) => r.pass).length;
  return { total: results.length, passing, failing: results.length - passing };
}

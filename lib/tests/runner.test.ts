import { describe, expect, it } from "vitest";
import registryData from "../../registry.json";
import type { Rule, RuleFields } from "@/lib/eligibility/types";
import { SEED_TESTS } from "./seed";
import { runTest, runTests, summarize } from "./runner";
import type { EligibilityTest } from "./types";

/** Seed dataset with stable ids, exactly as the repository loads it. */
const REGISTRY: Rule[] = (registryData as RuleFields[]).map((r, i) => ({
  ...r,
  id: `seed-${i}`,
}));

/** The seed tests with ids, as the repository's memory store builds them. */
const TESTS: EligibilityTest[] = SEED_TESTS.map((t, i) => ({
  ...t,
  id: `seed-test-${i}`,
}));

describe("test runner (against seed registry.json)", () => {
  it("all three starting cases pass", () => {
    const runs = runTests(TESTS, REGISTRY);
    expect(summarize(runs)).toEqual({ total: 3, passing: 3, failing: 0 });
    for (const run of runs) {
      expect(run.pass, `${run.test.name} should pass`).toBe(true);
    }
  });

  it("flags the exact column that mismatches", () => {
    const broken: EligibilityTest = {
      ...TESTS[0], // Cigna/Commercial/PPO/WA → really referral "No"
      expected: { ...TESTS[0].expected, referral_required: "CA Referral" },
    };
    const run = runTest(broken, REGISTRY);
    expect(run.pass).toBe(false);
    expect(run.checks.referral_required.pass).toBe(false);
    expect(run.checks.referral_required.actual).toBe("No");
    expect(run.checks.referral_required.expected).toBe("CA Referral");
    // The other three columns still match.
    expect(run.checks.serviceable.pass).toBe(true);
    expect(run.checks.pre_auth_required.pass).toBe(true);
    expect(run.checks.preventative_coverage.pass).toBe(true);
  });

  it("compares outcome values case-insensitively", () => {
    const loose: EligibilityTest = {
      ...TESTS[2], // Blocked state → all "No"
      expected: {
        serviceable: "no",
        pre_auth_required: "NO",
        referral_required: "no",
        preventative_coverage: "No",
      },
    };
    expect(runTest(loose, REGISTRY).pass).toBe(true);
  });
});

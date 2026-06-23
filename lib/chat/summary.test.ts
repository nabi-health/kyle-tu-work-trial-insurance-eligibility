import { describe, expect, it } from "vitest";
import type {
  Decision,
  EligibilityResult,
  OutcomeKey,
  OutcomeResult,
} from "../eligibility/types";
import { summarizeBulkResolution, summarizeResultsForModel } from "./summary";

function outcome(value: string): OutcomeResult {
  return { value, drivingRuleIds: [] };
}

function result(decision: Decision, over: Partial<EligibilityResult> = {}): EligibilityResult {
  const outcomes = {
    serviceable: outcome("Yes"),
    pre_auth_required: outcome("No"),
    referral_required: outcome("No"),
    preventative_coverage: outcome("Yes"),
  } as Record<OutcomeKey, OutcomeResult>;
  return {
    query: {
      payer_group: "Aetna",
      plan_type: "Commercial",
      plan_structure: "PPO",
      service_state: "CA",
    },
    outcomes,
    decision,
    matchedRules: [],
    hasMatch: true,
    ...over,
  };
}

describe("summarizeResultsForModel", () => {
  it("reports the empty case", () => {
    expect(summarizeResultsForModel([])).toContain("No rows were checked");
  });

  it("counts results per decision with display labels", () => {
    const out = summarizeResultsForModel([
      result("guarantee"),
      result("guarantee"),
      result("not_eligible"),
    ]);
    expect(out).toContain("Checked 3 member rows");
    expect(out).toContain("Apply Nabi Guarantee: 2");
    expect(out).toContain("Not Eligible: 1");
  });

  it("counts no-match rows separately", () => {
    const out = summarizeResultsForModel([
      result("needs_research", { hasMatch: false }),
    ]);
    expect(out).toContain("1 row matched no rule");
  });

  it("includes a capped list of example rows", () => {
    const many = Array.from({ length: 10 }, () => result("guarantee"));
    const out = summarizeResultsForModel(many, 3);
    expect(out).toContain("Examples (first 3)");
    // 3 example bullet lines for the query identity.
    expect(out.match(/Aetna \/ Commercial \/ PPO \/ CA/g)).toHaveLength(3);
  });
});

describe("summarizeBulkResolution", () => {
  it("describes a discard without applying anything", () => {
    expect(summarizeBulkResolution("discarded", 4)).toContain("discarded");
    expect(summarizeBulkResolution("discarded", 4)).toContain("Nothing was written");
  });

  it("describes how many ops were applied on confirm", () => {
    expect(summarizeBulkResolution("confirmed", 3)).toContain("3 rule operations");
  });
});

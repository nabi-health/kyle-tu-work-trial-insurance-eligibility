import { describe, expect, it } from "vitest";
import registryData from "../../registry.json";
import { evaluate } from "../eligibility/engine";
import type {
  EligibilityQuery,
  EligibilityResult,
  OutcomeKey,
  Rule,
  RuleFields,
} from "../eligibility/types";
import { parseCsv } from "./csv";
import { RESULT_COLUMNS, resultToRow, resultsToCsv } from "./export";

const REGISTRY: Rule[] = (registryData as RuleFields[]).map((r, i) => ({
  ...r,
  id: `seed-${i}`,
}));

const q = (over: Partial<EligibilityQuery> = {}): EligibilityQuery => ({
  payer_group: "Aetna",
  plan_type: "Commercial",
  plan_structure: "PPO",
  service_state: "CA",
  ...over,
});

describe("resultToRow", () => {
  it("flattens inputs, raw decision key, outcome values, and match metadata", () => {
    const result = evaluate(q(), REGISTRY);
    const row = resultToRow(result);
    // every declared column is present
    expect(Object.keys(row).sort()).toEqual([...RESULT_COLUMNS].sort());
    expect(row.payer_group).toBe("Aetna");
    expect(row.decision).toBe(result.decision); // raw key, not display label
    expect(row.serviceable).toBe(result.outcomes.serviceable.value);
    expect(row.matched_rule_count).toBe(String(result.matchedRules.length));
  });

  it("represents a no-match row as has_match=false with Needs Review outcomes", () => {
    const nr = (): { value: string; drivingRuleIds: string[] } => ({
      value: "Needs Review",
      drivingRuleIds: [],
    });
    const outcomes = {
      serviceable: nr(),
      pre_auth_required: nr(),
      referral_required: nr(),
      preventative_coverage: nr(),
    } as Record<OutcomeKey, { value: string; drivingRuleIds: string[] }>;
    const result: EligibilityResult = {
      query: q(),
      outcomes,
      decision: "needs_research",
      matchedRules: [],
      hasMatch: false,
    };
    const row = resultToRow(result);
    expect(row.has_match).toBe("false");
    expect(row.matched_rule_count).toBe("0");
    expect(row.serviceable).toBe("Needs Review");
  });
});

describe("resultsToCsv", () => {
  it("emits the header in column order", () => {
    const csv = resultsToCsv([evaluate(q(), REGISTRY)]);
    expect(csv.split("\r\n")[0]).toBe(RESULT_COLUMNS.join(","));
  });

  it("round-trips: re-parsing an export recovers the input query fields", () => {
    const queries = [q(), q({ payer_group: "Blue Cross, Inc.", service_state: "NY" })];
    const csv = resultsToCsv(queries.map((query) => evaluate(query, REGISTRY)));
    const back = parseCsv(csv);
    expect(back.success && back.rows).toEqual(queries);
  });
});

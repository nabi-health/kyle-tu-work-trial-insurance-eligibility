import { describe, expect, it } from "vitest";
import type { Rule, RuleFields } from "@/lib/eligibility/types";
import { referencedRules, relabelRuleMentions } from "./rule-mentions";

function rule(id: string, over: Partial<RuleFields>): Rule {
  return {
    id,
    payer_group: "*",
    payer_id: "*",
    plan_type: "*",
    group_number: "*",
    plan_structure: "*",
    service_state: "*",
    serviceable: "*",
    pre_auth_required: "*",
    referral_required: "*",
    preventative_coverage: "*",
    last_verified: "",
    verified_by: "",
    notes: "",
    ...over,
  };
}

const RULES: Rule[] = [
  rule("11111111-aaaa", { payer_group: "Aetna", plan_structure: "PPO", service_state: "WA" }),
  rule("22222222-bbbb", { payer_group: "Cigna", plan_structure: "HMO", service_state: "CA" }),
];

describe("referencedRules", () => {
  it("resolves [R#] tokens by 1-based index", () => {
    expect(referencedRules("This conflicts with [R2].", RULES)).toEqual([RULES[1]]);
  });

  it("resolves multiple tokens in order, deduped", () => {
    const out = referencedRules("[R1] overlaps [R2], and [R1] again", RULES);
    expect(out).toEqual([RULES[0], RULES[1]]);
  });

  it("falls back to raw ids (e.g. if the model pasted one)", () => {
    expect(referencedRules("see 22222222-bbbb", RULES)).toEqual([RULES[1]]);
  });

  it("ignores out-of-range tokens", () => {
    expect(referencedRules("[R9] does not exist", RULES)).toEqual([]);
  });
});

describe("relabelRuleMentions", () => {
  it("replaces a token with the rule's legible criteria label", () => {
    const out = relabelRuleMentions("Edit [R1] to be non-serviceable.", RULES);
    expect(out).toContain("Aetna · Any · PPO · WA");
    expect(out).not.toContain("[R1]");
  });

  it("leaves unknown tokens untouched", () => {
    expect(relabelRuleMentions("[R9] unknown", RULES)).toBe("[R9] unknown");
  });
});

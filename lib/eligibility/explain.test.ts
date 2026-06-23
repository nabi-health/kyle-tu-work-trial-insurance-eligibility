import { describe, expect, it } from "vitest";
import registryData from "../../registry.json";
import { evaluate } from "./engine";
import { decidingColumns, explainDecision } from "./explain";
import type {
  Decision,
  EligibilityResult,
  OutcomeKey,
  Rule,
  RuleFields,
} from "./types";

const REGISTRY: Rule[] = (registryData as RuleFields[]).map((r, i) => ({
  ...r,
  id: `seed-${i}`,
}));

/** A fully-populated rule; override only what a test cares about. */
function rule(id: string, over: Partial<Rule> = {}): Rule {
  return {
    id,
    payer_group: "Aetna",
    payer_id: "*",
    plan_type: "Commercial",
    group_number: "*",
    plan_structure: "PPO",
    service_state: "CA",
    serviceable: "Yes",
    pre_auth_required: "No",
    referral_required: "No",
    preventative_coverage: "Yes",
    last_verified: "",
    verified_by: "",
    notes: "",
    ...over,
  };
}

type Outcomes = EligibilityResult["outcomes"];
const oc = (value: string, ...drivingRuleIds: string[]) => ({
  value,
  drivingRuleIds,
});

/** Outcomes defaulting to the clean-guarantee state; override per test. */
function outcomes(over: Partial<Outcomes> = {}): Outcomes {
  return {
    serviceable: oc("Yes", "r1"),
    pre_auth_required: oc("No", "r1"),
    referral_required: oc("No", "r1"),
    preventative_coverage: oc("Yes", "r1"),
    ...over,
  };
}

function result(
  decision: Decision,
  over: Partial<Outcomes>,
  matchedRules: Rule[],
): EligibilityResult {
  return {
    query: {
      payer_group: "",
      plan_type: "",
      plan_structure: "",
      service_state: "",
    },
    outcomes: outcomes(over),
    decision,
    matchedRules,
    hasMatch: matchedRules.length > 0,
  };
}

const cigna = (id: string) =>
  rule(id, { payer_group: "Cigna", plan_structure: "HMO" });

describe("decidingColumns", () => {
  it("not_eligible — single blocked column", () => {
    const r = result("not_eligible", { serviceable: oc("No", "r1") }, [
      rule("r1"),
    ]);
    expect(decidingColumns(r)).toEqual({
      decision: "not_eligible",
      keys: ["serviceable"],
      reason: "blocked",
    });
  });

  it("not_eligible — both columns blocked", () => {
    const r = result(
      "not_eligible",
      { serviceable: oc("No", "r1"), preventative_coverage: oc("No", "r2") },
      [rule("r1"), cigna("r2")],
    );
    expect(decidingColumns(r).keys).toEqual([
      "serviceable",
      "preventative_coverage",
    ]);
  });

  it("needs_research — every uncertain column is named", () => {
    const r = result(
      "needs_research",
      {
        serviceable: oc("Needs Review", "r1"),
        referral_required: oc("Unknown", "r1"),
      },
      [rule("r1")],
    );
    expect(decidingColumns(r)).toEqual({
      decision: "needs_research",
      keys: ["serviceable", "referral_required"],
      reason: "uncertain",
    });
  });

  it("guarantee_after_referral — referral is the deciding column", () => {
    const r = result(
      "guarantee_after_referral",
      { referral_required: oc("CA Referral", "r1") },
      [rule("r1")],
    );
    expect(decidingColumns(r)).toEqual({
      decision: "guarantee_after_referral",
      keys: ["referral_required"],
      reason: "referral",
    });
  });

  it("guarantee — clean path has no deciding column", () => {
    const r = result("guarantee", {}, [rule("r1")]);
    expect(decidingColumns(r)).toEqual({
      decision: "guarantee",
      keys: [],
      reason: "clean",
    });
  });
});

describe("explainDecision", () => {
  it("not_eligible names the column and a single driver", () => {
    const r = result("not_eligible", { serviceable: oc("No", "r1") }, [
      rule("r1"),
    ]);
    expect(explainDecision(r)).toBe(
      "Not Eligible because Serviceable is No, set by 1 rule (Aetna · PPO).",
    );
  });

  it("pluralizes and names up to two drivers", () => {
    const r = result("not_eligible", { serviceable: oc("No", "r1", "r2") }, [
      rule("r1"),
      cigna("r2"),
    ]);
    expect(explainDecision(r)).toBe(
      "Not Eligible because Serviceable is No, set by 2 rules (Aetna · PPO, Cigna · HMO).",
    );
  });

  it("caps names at two and counts the remainder", () => {
    const r = result(
      "not_eligible",
      { serviceable: oc("No", "r1", "r2", "r3") },
      [rule("r1"), cigna("r2"), rule("r3", { payer_group: "Humana" })],
    );
    expect(explainDecision(r)).toBe(
      "Not Eligible because Serviceable is No, set by 3 rules (Aetna · PPO, Cigna · HMO, +1 more).",
    );
  });

  it("joins multiple blocked columns with 'and' and dedupes drivers", () => {
    const r = result(
      "not_eligible",
      { serviceable: oc("No", "r1"), preventative_coverage: oc("No", "r2") },
      [rule("r1"), cigna("r2")],
    );
    expect(explainDecision(r)).toBe(
      "Not Eligible because Serviceable is No and Preventative Coverage is No, set by 2 rules (Aetna · PPO, Cigna · HMO).",
    );
  });

  it("needs_research names the uncertain columns and their values", () => {
    const r = result(
      "needs_research",
      {
        serviceable: oc("Needs Review", "r1"),
        referral_required: oc("Unknown", "r1"),
      },
      [rule("r1")],
    );
    expect(explainDecision(r)).toBe(
      "Needs Research because Serviceable is Needs Review and Referral Required is Unknown — verify before giving the patient an answer.",
    );
  });

  it("guarantee_after_referral explains the referral requirement", () => {
    const r = result(
      "guarantee_after_referral",
      { referral_required: oc("CA Referral", "r1") },
      [rule("r1")],
    );
    expect(explainDecision(r)).toBe(
      "Apply the guarantee once a referral is received — Referral Required is CA Referral, set by 1 rule (Aetna · PPO).",
    );
  });

  it("guarantee uses positive phrasing with no driver", () => {
    const r = result("guarantee", {}, [rule("r1")]);
    expect(explainDecision(r)).toBe(
      "Apply the Nabi Guarantee — serviceable with preventative coverage and no referral required.",
    );
  });

  it("is deterministic", () => {
    const r = result("not_eligible", { serviceable: oc("No", "r1") }, [
      rule("r1"),
    ]);
    expect(explainDecision(r)).toBe(explainDecision(r));
  });

  it("explains a real evaluate() result from the seed registry", () => {
    const r = evaluate(
      {
        payer_group: "Aetna",
        plan_type: "Commercial",
        plan_structure: "PPO",
        service_state: "CA",
      },
      REGISTRY,
    );
    expect(r.decision).toBe("guarantee_after_referral");
    expect(explainDecision(r)).toContain("Referral Required is CA Referral");
  });
});

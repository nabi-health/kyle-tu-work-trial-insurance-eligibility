import { describe, expect, it } from "vitest";
import registryData from "../../registry.json";
import { decide, evaluate } from "./engine";
import type { EligibilityQuery, Rule, RuleFields } from "./types";

/** Seed dataset with stable ids, exactly as the repository loads it. */
const REGISTRY: Rule[] = (registryData as RuleFields[]).map((r, i) => ({
  ...r,
  id: `seed-${i}`,
}));

function outcomes(q: EligibilityQuery) {
  const r = evaluate(q, REGISTRY);
  return {
    serviceable: r.outcomes.serviceable.value,
    pre_auth_required: r.outcomes.pre_auth_required.value,
    referral_required: r.outcomes.referral_required.value,
    preventative_coverage: r.outcomes.preventative_coverage.value,
  };
}

describe("Notion spec test cases (against seed registry.json)", () => {
  it("Case 1 — Cigna/Commercial/PPO/WA → serviceable, no referral", () => {
    expect(
      outcomes({
        payer_group: "Cigna",
        plan_type: "Commercial",
        plan_structure: "PPO",
        service_state: "WA",
      }),
    ).toEqual({
      serviceable: "Yes",
      pre_auth_required: "No",
      referral_required: "No",
      preventative_coverage: "Yes",
    });
  });

  it("Case 2 — Aetna/Commercial/PPO/CA → CA Referral overrides", () => {
    expect(
      outcomes({
        payer_group: "Aetna",
        plan_type: "Commercial",
        plan_structure: "PPO",
        service_state: "CA",
      }),
    ).toEqual({
      serviceable: "Yes",
      pre_auth_required: "No",
      referral_required: "CA Referral",
      preventative_coverage: "Yes",
    });
  });

  it("Case 3 — Aetna/Commercial/PPO/OH → blocked state wins", () => {
    expect(
      outcomes({
        payer_group: "Aetna",
        plan_type: "Commercial",
        plan_structure: "PPO",
        service_state: "OH",
      }),
    ).toEqual({
      serviceable: "No",
      pre_auth_required: "No",
      referral_required: "No",
      preventative_coverage: "No",
    });
  });
});

describe("SOP worked examples (synthetic rule set)", () => {
  const blank = {
    payer_id: "*",
    group_number: "*",
    pre_auth_required: "*",
    preventative_coverage: "*",
    last_verified: "",
    verified_by: "",
    notes: "",
  };
  const caReferral: Rule = {
    id: "ca",
    payer_group: "*",
    plan_type: "*",
    plan_structure: "*",
    service_state: "CA",
    serviceable: "*",
    referral_required: "CA Referral",
    ...blank,
  };
  const aetna: Rule = {
    id: "aetna",
    payer_group: "Aetna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "*",
    serviceable: "Yes",
    referral_required: "No",
    ...blank,
  };
  const maine: Rule = {
    id: "me",
    payer_group: "*",
    plan_type: "*",
    plan_structure: "*",
    service_state: "ME,NJ",
    serviceable: "No",
    referral_required: "No",
    ...blank,
  };
  const rules = [caReferral, aetna, maine];
  const q = (service_state: string): EligibilityQuery => ({
    payer_group: "Aetna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state,
  });

  it("Example 1 — Aetna Commercial PPO in WA → Yes / No", () => {
    const r = evaluate(q("WA"), rules);
    expect(r.outcomes.serviceable.value).toBe("Yes");
    expect(r.outcomes.referral_required.value).toBe("No");
  });

  it("Example 2 — Aetna Commercial PPO in CA → Yes / CA Referral", () => {
    const r = evaluate(q("CA"), rules);
    expect(r.outcomes.serviceable.value).toBe("Yes");
    expect(r.outcomes.referral_required.value).toBe("CA Referral");
  });

  it("Example 3 — Aetna Commercial PPO in ME → No / No", () => {
    const r = evaluate(q("ME"), rules);
    expect(r.outcomes.serviceable.value).toBe("No");
    expect(r.outcomes.referral_required.value).toBe("No");
  });
});

describe("aggregation edge cases", () => {
  it("no matching rule → all outcomes Needs Review", () => {
    const r = evaluate(
      {
        payer_group: "Nonexistent Payer",
        plan_type: "Commercial",
        plan_structure: "PPO",
        service_state: "WA",
      },
      [],
    );
    expect(r.hasMatch).toBe(false);
    expect(r.outcomes.serviceable.value).toBe("Needs Review");
    expect(r.outcomes.referral_required.value).toBe("Needs Review");
    expect(r.decision).toBe("needs_research");
  });

  it("a single all-wildcard match resolves to Needs Review, not '*'", () => {
    const wild: Rule = {
      id: "w",
      payer_group: "*",
      plan_type: "*",
      plan_structure: "*",
      service_state: "*",
      serviceable: "*",
      pre_auth_required: "*",
      referral_required: "*",
      preventative_coverage: "*",
      payer_id: "*",
      group_number: "*",
      last_verified: "",
      verified_by: "",
      notes: "",
    };
    const r = evaluate(
      {
        payer_group: "Aetna",
        plan_type: "Commercial",
        plan_structure: "PPO",
        service_state: "WA",
      },
      [wild],
    );
    expect(r.outcomes.serviceable.value).toBe("Needs Review");
  });

  it("records the driving rule(s) for an aggregated outcome", () => {
    const r = evaluate(
      {
        payer_group: "Aetna",
        plan_type: "Commercial",
        plan_structure: "PPO",
        service_state: "OH",
      },
      REGISTRY,
    );
    // The blocked-states rule drives serviceable=No.
    const driver = REGISTRY.find((x) =>
      r.outcomes.serviceable.drivingRuleIds.includes(x.id),
    );
    expect(driver?.serviceable).toBe("No");
  });
});

describe("decision logic", () => {
  const mk = (
    serviceable: string,
    referral: string,
    preventative: string,
  ) =>
    decide({
      serviceable: { value: serviceable, drivingRuleIds: [] },
      pre_auth_required: { value: "No", drivingRuleIds: [] },
      referral_required: { value: referral, drivingRuleIds: [] },
      preventative_coverage: { value: preventative, drivingRuleIds: [] },
    });

  it("clean serviceable + preventative + no referral → guarantee", () => {
    expect(mk("Yes", "No", "Yes")).toBe("guarantee");
  });
  it("referral required → guarantee after referral", () => {
    expect(mk("Yes", "Yes", "Yes")).toBe("guarantee_after_referral");
    expect(mk("Yes", "CA Referral", "Yes")).toBe("guarantee_after_referral");
  });
  it("not serviceable or no preventative → not eligible", () => {
    expect(mk("No", "No", "Yes")).toBe("not_eligible");
    expect(mk("Yes", "No", "No")).toBe("not_eligible");
  });
  it("uncertainty → needs research", () => {
    expect(mk("Needs Review", "No", "Yes")).toBe("needs_research");
    expect(mk("Yes", "Unknown", "Yes")).toBe("needs_research");
  });
});

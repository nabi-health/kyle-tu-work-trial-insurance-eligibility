import { describe, expect, it } from "vitest";
import type { Rule, RuleFields } from "../eligibility/types";
import {
  detectWarnings,
  findConflicts,
  findDuplicateGroups,
  validateRegistry,
} from "./validation";

/** Build a rule from partial fields over an all-wildcard base. */
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

const stripId = (r: Rule): RuleFields => {
  const { id: _id, ...fields } = r;
  return fields;
};

describe("findDuplicateGroups", () => {
  it("groups rules with identical criteria AND aligned outcomes", () => {
    const a = rule("a", {
      payer_group: "Aetna",
      plan_type: "Commercial",
      service_state: "CA",
      serviceable: "Yes",
    });
    const b = rule("b", {
      payer_group: "Aetna",
      plan_type: "Commercial",
      service_state: "CA",
      serviceable: "Yes",
    });
    const c = rule("c", { payer_group: "Cigna" });

    const groups = findDuplicateGroups([a, b, c]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((r) => r.id).sort()).toEqual(["a", "b"]);
  });

  it("treats service_state as an order-insensitive set", () => {
    const a = rule("a", { payer_group: "Aetna", service_state: "CA,WA" });
    const b = rule("b", { payer_group: "Aetna", service_state: "WA,CA" });
    expect(findDuplicateGroups([a, b])).toHaveLength(1);
  });

  it("a same-criteria pair with a wildcard outcome is a duplicate, not a conflict", () => {
    const a = rule("a", { payer_group: "Aetna", serviceable: "Yes" });
    const b = rule("b", { payer_group: "Aetna", serviceable: "*" });
    expect(findDuplicateGroups([a, b])).toHaveLength(1);
    expect(findConflicts([a, b])).toHaveLength(0);
  });

  it("does NOT group same-criteria rules whose outcomes contradict", () => {
    const a = rule("a", { payer_group: "Aetna", serviceable: "Yes" });
    const b = rule("b", { payer_group: "Aetna", serviceable: "No" });
    expect(findDuplicateGroups([a, b])).toHaveLength(0);
  });

  it("returns no groups when every rule's criteria are unique", () => {
    const a = rule("a", { payer_group: "Aetna" });
    const b = rule("b", { payer_group: "Cigna" });
    expect(findDuplicateGroups([a, b])).toHaveLength(0);
  });
});

describe("findConflicts", () => {
  it("flags identical criteria with differing outcomes", () => {
    const a = rule("a", {
      payer_group: "Aetna",
      plan_type: "Commercial",
      serviceable: "Yes",
    });
    const b = rule("b", {
      payer_group: "Aetna",
      plan_type: "Commercial",
      serviceable: "No",
    });
    const conflicts = findConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].outcomes).toEqual(["serviceable"]);
    expect([conflicts[0].a.id, conflicts[0].b.id].sort()).toEqual(["a", "b"]);
  });

  it("does NOT flag overlapping-but-different criteria (the key relaxation)", () => {
    // A state-specific rule beside an all-states rule for the same payer.
    // They overlap, but the priority aggregator resolves them by design.
    const specific = rule("specific", {
      payer_group: "Aetna",
      service_state: "CA,WA",
      serviceable: "No",
    });
    const allStates = rule("all", {
      payer_group: "Aetna",
      service_state: "*",
      serviceable: "Yes",
    });
    expect(findConflicts([specific, allStates])).toHaveLength(0);
  });

  it("does not flag rules whose criteria differ on plan type", () => {
    const commercial = rule("c", {
      plan_type: "Commercial",
      serviceable: "Yes",
    });
    const medicare = rule("m", { plan_type: "Medicare", serviceable: "No" });
    expect(findConflicts([commercial, medicare])).toHaveLength(0);
  });

  it("collects every outcome column that disagrees", () => {
    const a = rule("a", {
      payer_group: "Aetna",
      serviceable: "Yes",
      referral_required: "No",
    });
    const b = rule("b", {
      payer_group: "Aetna",
      serviceable: "No",
      referral_required: "Yes",
    });
    const conflicts = findConflicts([a, b]);
    expect(conflicts[0].outcomes.sort()).toEqual([
      "referral_required",
      "serviceable",
    ]);
  });
});

describe("validateRegistry", () => {
  it("reports duplicates and conflicts in separate buckets", () => {
    const a = rule("a", { payer_group: "Aetna", serviceable: "Yes" });
    const dupOfA = rule("a2", { payer_group: "Aetna", serviceable: "Yes" });
    const c1 = rule("c1", { payer_group: "Cigna", serviceable: "Yes" });
    const c2 = rule("c2", { payer_group: "Cigna", serviceable: "No" });

    const result = validateRegistry([a, dupOfA, c1, c2]);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].map((r) => r.id).sort()).toEqual(["a", "a2"]);
    expect(result.conflicts).toHaveLength(1);
    expect([result.conflicts[0].a.id, result.conflicts[0].b.id].sort()).toEqual(
      ["c1", "c2"],
    );
  });
});

describe("detectWarnings (add/edit path)", () => {
  const criteria = {
    payer_group: "Aetna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "CA",
  };
  const existing = rule("existing", { ...criteria, serviceable: "Yes" });

  it("warns on a duplicate (same criteria, aligned outcome)", () => {
    const candidate = stripId(rule("x", { ...criteria, serviceable: "Yes" }));
    const warnings = detectWarnings(candidate, [existing]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("duplicate");
  });

  it("warns on a conflict (same criteria, different outcome)", () => {
    const candidate = stripId(rule("x", { ...criteria, serviceable: "No" }));
    const warnings = detectWarnings(candidate, [existing]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("different outcome");
  });

  it("does not warn when match criteria are unique", () => {
    const candidate = stripId(
      rule("x", { ...criteria, service_state: "WA", serviceable: "No" }),
    );
    expect(detectWarnings(candidate, [existing])).toHaveLength(0);
  });

  it("excludes the rule being edited via selfId", () => {
    const candidate = stripId(existing);
    expect(detectWarnings(candidate, [existing], "existing")).toHaveLength(0);
  });
});

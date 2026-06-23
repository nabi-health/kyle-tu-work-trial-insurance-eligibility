import { describe, expect, it } from "vitest";
import type { Rule, RuleFields } from "@/lib/eligibility/types";
import { buildSystemPrompt, PROPOSE_RULE_CHANGE_TOOL } from "./proposal-tool";

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

describe("buildSystemPrompt", () => {
  it("notes an empty registry", () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain("0 rules");
    expect(prompt).toContain("registry is currently empty");
  });

  it("includes one compact line per rule with its id and key fields", () => {
    const prompt = buildSystemPrompt([
      rule("rule_a", { payer_group: "Aetna", plan_structure: "PPO", service_state: "TX", serviceable: "No" }),
    ]);
    expect(prompt).toContain("1 rule");
    expect(prompt).toContain("rule_a");
    expect(prompt).toContain("payer_group=Aetna");
    expect(prompt).toContain("plan_structure=PPO");
    expect(prompt).toContain("Serviceable=No");
  });

  it("lists allowed plan structures and outcome values", () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain("PPO");
    expect(prompt).toContain("Needs Review");
  });
});

describe("PROPOSE_RULE_CHANGE_TOOL", () => {
  it("constrains outcomes to allowed enums and requires the core fields", () => {
    expect(PROPOSE_RULE_CHANGE_TOOL.name).toBe("propose_rule_change");
    const props = PROPOSE_RULE_CHANGE_TOOL.input_schema.properties as Record<
      string,
      unknown
    >;
    const fields = props.fields as {
      properties: Record<string, { enum?: string[] }>;
      required: string[];
    };
    expect(fields.properties.serviceable.enum).toContain("Needs Review");
    expect(fields.properties.plan_structure.enum).toContain("PPO");
    expect(fields.required).toContain("serviceable");
    expect(fields.required).toContain("payer_group");
  });
});

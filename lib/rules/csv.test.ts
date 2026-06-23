import { describe, expect, it } from "vitest";
import { parseRuleCsv } from "./csv";

const HEADER =
  "payer_group,plan_type,plan_structure,service_state,serviceable,pre_auth_required,referral_required,preventative_coverage";

describe("parseRuleCsv", () => {
  it("parses a valid rule row with defaults for omitted optional columns", () => {
    const csv = `${HEADER}\nAetna,Commercial,PPO,CA,Yes,No,No,Yes`;
    const res = parseRuleCsv(csv);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].payer_group).toBe("Aetna");
    expect(res.rows[0].serviceable).toBe("Yes");
    // Optional columns default via parseRulePayload.
    expect(res.rows[0].payer_id).toBe("*");
    expect(res.rows[0].group_number).toBe("*");
  });

  it("normalizes header casing/spacing", () => {
    const csv =
      "Payer Group,Plan Type,Plan Structure,Service State,Serviceable,Pre Auth Required,Referral Required,Preventative Coverage\nCigna,Commercial,HMO,WA,Yes,No,No,Yes";
    const res = parseRuleCsv(csv);
    expect(res.success).toBe(true);
    if (res.success) expect(res.rows[0].payer_group).toBe("Cigna");
  });

  it("rejects the file when a required column is missing", () => {
    const csv =
      "payer_group,plan_type,plan_structure,service_state,serviceable,pre_auth_required,referral_required\nAetna,Commercial,PPO,CA,Yes,No,No";
    const res = parseRuleCsv(csv);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.errors[0].row).toBe(0);
    expect(res.errors[0].message).toContain("preventative_coverage");
  });

  it("collects per-field validation errors keyed to the line", () => {
    const csv = `${HEADER}\nAetna,Bogus,PPO,CA,Yes,No,No,Yes`;
    const res = parseRuleCsv(csv);
    expect(res.success).toBe(false);
    if (res.success) return;
    const planTypeErr = res.errors.find((e) => e.column === "plan_type");
    expect(planTypeErr).toBeDefined();
    expect(planTypeErr?.row).toBe(2); // header is line 1
  });

  it("rejects an empty file", () => {
    expect(parseRuleCsv("").success).toBe(false);
  });

  it("rejects a header with no data rows", () => {
    const res = parseRuleCsv(HEADER);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errors[0].message).toContain("No data rows");
  });
});

import { describe, expect, it } from "vitest";
import { MAX_ROWS, parseQueryRows } from "./validation";

const ok = {
  payer_group: "Aetna",
  plan_type: "Commercial",
  plan_structure: "PPO",
  service_state: "CA",
};

describe("parseQueryRows", () => {
  it("accepts valid rows and returns canonical queries", () => {
    const r = parseQueryRows([ok]);
    expect(r).toEqual({ success: true, queries: [ok] });
  });

  it("canonicalizes case for plan fields and uppercases the state", () => {
    const r = parseQueryRows([
      { payer_group: "Aetna", plan_type: "commercial", plan_structure: "ppo", service_state: "ca" },
    ]);
    expect(r.success && r.queries[0]).toEqual(ok);
  });

  it("leaves free-text payer untouched (unknown payer is valid input)", () => {
    const r = parseQueryRows([{ ...ok, payer_group: "Some New Payer" }]);
    expect(r.success && r.queries[0].payer_group).toBe("Some New Payer");
  });

  it("reports a precise row+column for a bad enum", () => {
    const r = parseQueryRows([{ ...ok, plan_structure: "XYZ" }]);
    expect(r.success).toBe(false);
    expect(!r.success && r.errors[0]).toMatchObject({ row: 2, column: "plan_structure" });
  });

  it("rejects an empty payer", () => {
    const r = parseQueryRows([{ ...ok, payer_group: "  " }]);
    expect(!r.success && r.errors[0].column).toBe("payer_group");
  });

  it("rejects a multi-state service_state", () => {
    const r = parseQueryRows([{ ...ok, service_state: "CA,WA" }]);
    expect(r.success).toBe(false);
    expect(!r.success && r.errors[0].column).toBe("service_state");
  });

  it("rejects an unknown state code", () => {
    const r = parseQueryRows([{ ...ok, service_state: "ZZ" }]);
    expect(r.success).toBe(false);
  });

  it("collects errors across multiple rows", () => {
    const r = parseQueryRows([
      ok,
      { ...ok, plan_type: "Nope" },
      { ...ok, service_state: "ZZ" },
    ]);
    expect(!r.success && r.errors.map((e) => e.row)).toEqual([3, 4]);
  });

  it("uses 1-based spreadsheet line numbers (first data row = 2)", () => {
    const r = parseQueryRows([{ ...ok, plan_type: "Nope" }]);
    expect(!r.success && r.errors[0].row).toBe(2);
  });

  it("rejects a non-object row (e.g. a bare JSON value)", () => {
    const r = parseQueryRows(["just a string"]);
    expect(r.success).toBe(false);
    expect(!r.success && r.errors[0].column).toBe("row");
  });

  it("rejects an empty array with a file-level error", () => {
    const r = parseQueryRows([]);
    expect(!r.success && r.errors[0].column).toBe("file");
  });

  it("rejects more than MAX_ROWS rows", () => {
    const r = parseQueryRows(Array.from({ length: MAX_ROWS + 1 }, () => ok));
    expect(r.success).toBe(false);
    expect(!r.success && r.errors[0].message).toContain(String(MAX_ROWS));
  });
});

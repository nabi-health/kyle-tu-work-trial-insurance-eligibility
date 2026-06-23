import { describe, expect, it } from "vitest";
import { QUERY_COLUMNS, parseCsv, toCsv } from "./csv";

const HEADER = "payer_group,plan_type,plan_structure,service_state";

describe("parseCsv", () => {
  it("parses simple rows into known columns", () => {
    const r = parseCsv(`${HEADER}\nAetna,Commercial,PPO,CA`);
    expect(r).toEqual({
      success: true,
      rows: [
        {
          payer_group: "Aetna",
          plan_type: "Commercial",
          plan_structure: "PPO",
          service_state: "CA",
        },
      ],
    });
  });

  it("handles quoted fields with embedded commas", () => {
    const r = parseCsv(`${HEADER}\n"Blue Cross, Inc.",Medicare,HMO,NY`);
    expect(r.success && r.rows[0].payer_group).toBe("Blue Cross, Inc.");
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    const r = parseCsv(`${HEADER}\n"He said ""hi""",Commercial,PPO,CA`);
    expect(r.success && r.rows[0].payer_group).toBe('He said "hi"');
  });

  it("accepts CRLF line endings and ignores a trailing newline", () => {
    const r = parseCsv(`${HEADER}\r\nAetna,Commercial,PPO,CA\r\n`);
    expect(r.success && r.rows).toHaveLength(1);
  });

  it("strips a UTF-8 BOM", () => {
    const r = parseCsv(`﻿${HEADER}\nAetna,Commercial,PPO,CA`);
    expect(r.success && r.rows[0].payer_group).toBe("Aetna");
  });

  it("normalizes header casing and spaces", () => {
    const r = parseCsv(`Payer Group,Plan Type,Plan Structure,Service State\nAetna,Commercial,PPO,CA`);
    expect(r.success && r.rows[0].service_state).toBe("CA");
  });

  it("drops extra/unknown columns", () => {
    const r = parseCsv(`${HEADER},notes\nAetna,Commercial,PPO,CA,ignore me`);
    expect(r.success && Object.keys(r.rows[0])).toEqual([...QUERY_COLUMNS]);
  });

  it("fills missing trailing cells in a ragged row with empty strings", () => {
    const r = parseCsv(`${HEADER}\nAetna,Commercial`);
    expect(r.success && r.rows[0]).toEqual({
      payer_group: "Aetna",
      plan_type: "Commercial",
      plan_structure: "",
      service_state: "",
    });
  });

  it("skips fully-blank lines", () => {
    const r = parseCsv(`${HEADER}\nAetna,Commercial,PPO,CA\n\n`);
    expect(r.success && r.rows).toHaveLength(1);
  });

  it("rejects a missing required column", () => {
    const r = parseCsv(`payer_group,plan_type,plan_structure\nAetna,Commercial,PPO`);
    expect(r.success).toBe(false);
    expect(!r.success && r.error).toContain("service_state");
  });

  it("rejects a duplicate header column", () => {
    const r = parseCsv(`${HEADER},payer_group\nAetna,Commercial,PPO,CA,Aetna`);
    expect(r.success).toBe(false);
    expect(!r.success && r.error).toContain("Duplicate");
  });

  it("rejects an unterminated quote", () => {
    const r = parseCsv(`${HEADER}\n"Aetna,Commercial,PPO,CA`);
    expect(r.success).toBe(false);
    expect(!r.success && r.error).toContain("unterminated");
  });

  it("rejects an empty file", () => {
    expect(parseCsv("   ").success).toBe(false);
  });
});

describe("toCsv", () => {
  it("quotes only fields that need it and round-trips with parseCsv", () => {
    const rows = [
      { payer_group: "Blue Cross, Inc.", plan_type: "Medicare", plan_structure: "HMO", service_state: "NY" },
      { payer_group: "Aetna", plan_type: "Commercial", plan_structure: "PPO", service_state: "CA" },
    ];
    const csv = toCsv(rows, QUERY_COLUMNS);
    expect(csv.split("\r\n")[1]).toBe('"Blue Cross, Inc.",Medicare,HMO,NY');
    const back = parseCsv(csv);
    expect(back.success && back.rows).toEqual(rows);
  });
});

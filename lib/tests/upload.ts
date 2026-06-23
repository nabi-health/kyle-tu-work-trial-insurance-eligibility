/**
 * CSV/JSON helpers for bulk test upload, templates, and export. Parsing is
 * structural only — column/enum validation lives in ./validation. Reuses the
 * shared RFC-4180 tokenizer so quoted notes (which can contain commas) survive.
 */
import { tokenizeCsv, toCsv } from "@/lib/check/csv";
import { SEED_TESTS } from "./seed";
import type { EligibilityTest, EligibilityTestInput } from "./types";

/** Flat test columns, in canonical order. CSV headers normalize to these. */
export const TEST_COLUMNS = [
  "name",
  "payer_group",
  "plan_type",
  "plan_structure",
  "service_state",
  "expected_serviceable",
  "expected_pre_auth_required",
  "expected_referral_required",
  "expected_preventative_coverage",
  "notes",
] as const;

/** Every column except the optional free-text notes is required in an upload. */
const REQUIRED = new Set<string>(
  TEST_COLUMNS.filter((c) => c !== "notes"),
);
const KNOWN = new Set<string>(TEST_COLUMNS);

export type CsvParse =
  | { success: true; rows: Record<string, string>[] }
  | { success: false; error: string };

/** trim → lowercase → spaces to underscores, so "Plan Type" maps to plan_type. */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Parse test CSV text into header-keyed rows over the known test columns. */
export function parseTestCsv(text: string): CsvParse {
  const clean = text.replace(/^﻿/, ""); // strip a UTF-8 BOM (Excel adds one)
  if (clean.trim() === "") return { success: false, error: "The file is empty." };

  const records = tokenizeCsv(clean);
  if (records === null) {
    return { success: false, error: "Malformed CSV: an unterminated quoted field." };
  }
  if (records.length === 0) return { success: false, error: "The file is empty." };

  const headers = records[0].map(normalizeHeader);
  const seen = new Set<string>();
  for (const h of headers) {
    if (h === "") continue;
    if (seen.has(h)) {
      return { success: false, error: `Duplicate column "${h}" in the header row.` };
    }
    seen.add(h);
  }

  const missing = [...REQUIRED].filter((c) => !seen.has(c));
  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
    };
  }

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const cells = records[r];
    const row: Record<string, string> = {};
    headers.forEach((h, c) => {
      if (KNOWN.has(h)) row[h] = (cells[c] ?? "").trim();
    });
    rows.push(row);
  }
  return { success: true, rows };
}

/** Flatten a test input/record to a CSV-row object over TEST_COLUMNS. */
function flatten(t: EligibilityTestInput): Record<string, string> {
  return {
    name: t.name,
    payer_group: t.payer_group,
    plan_type: t.plan_type,
    plan_structure: t.plan_structure,
    service_state: t.service_state,
    expected_serviceable: t.expected.serviceable,
    expected_pre_auth_required: t.expected.pre_auth_required,
    expected_referral_required: t.expected.referral_required,
    expected_preventative_coverage: t.expected.preventative_coverage,
    notes: t.notes,
  };
}

/** A CSV template pre-filled with the starting cases as worked examples. */
export function csvTestTemplate(): string {
  return toCsv(SEED_TESTS.map(flatten), TEST_COLUMNS);
}

/** A JSON template (the flat upload shape) pre-filled with the starting cases. */
export function jsonTestTemplate(): string {
  return JSON.stringify(SEED_TESTS.map(flatten), null, 2);
}

/** Serialize the current tests to CSV for download/round-trip. */
export function testsToCsv(tests: EligibilityTest[]): string {
  return toCsv(tests.map(flatten), TEST_COLUMNS);
}

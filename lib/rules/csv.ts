/**
 * CSV import for whole rules (the bulk-update path), as opposed to member
 * queries (`lib/check/csv.ts`). Structural tokenizing is shared via
 * `tokenizeCsv`; per-field business validation reuses `parseRulePayload`, so a
 * CSV row is held to exactly the same rules as the JSON editor and the form.
 */
import { tokenizeCsv } from "../check/csv";
import type { RowError } from "../check/validation";
import { MAX_ROWS } from "../check/validation";
import type { RuleFields } from "../eligibility/types";
import { parseRulePayload } from "./validation";

/** Every rule column accepted from a CSV (auto-stamped meta is excluded). */
export const RULE_COLUMNS = [
  "payer_group",
  "payer_id",
  "plan_type",
  "group_number",
  "plan_structure",
  "service_state",
  "serviceable",
  "pre_auth_required",
  "referral_required",
  "preventative_coverage",
  "notes",
] as const;

/**
 * Columns a rule CSV must declare. payer_id, group_number and notes are
 * optional — `parseRulePayload` defaults them (to "*" / "*" / "").
 */
export const REQUIRED_RULE_COLUMNS = [
  "payer_group",
  "plan_type",
  "plan_structure",
  "service_state",
  "serviceable",
  "pre_auth_required",
  "referral_required",
  "preventative_coverage",
] as const;

/** The four outcome columns — their presence distinguishes a rule CSV from a member-query CSV. */
export const OUTCOME_COLUMNS = [
  "serviceable",
  "pre_auth_required",
  "referral_required",
  "preventative_coverage",
] as const;

export type ParseRuleCsvResult =
  | { success: true; rows: RuleFields[] }
  | { success: false; errors: RowError[] };

/** trim → lowercase → spaces to underscores, so "Plan Type" maps to plan_type. */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

const KNOWN = new Set<string>(RULE_COLUMNS);

/**
 * Parse a CSV of full rules into validated `RuleFields[]`. Collects every error
 * across every row (no short-circuit) keyed to the 1-based spreadsheet line, so
 * the reject-whole-file UX can list them all — mirrors `parseQueryRows`.
 */
export function parseRuleCsv(text: string): ParseRuleCsvResult {
  const clean = text.replace(/^﻿/, "");
  const fileError = (message: string): ParseRuleCsvResult => ({
    success: false,
    errors: [{ row: 0, column: "file", message }],
  });

  if (clean.trim() === "") return fileError("The file is empty.");

  const records = tokenizeCsv(clean);
  if (records === null) {
    return fileError("Malformed CSV: an unterminated quoted field.");
  }
  if (records.length === 0) return fileError("The file is empty.");

  const headers = records[0].map(normalizeHeader);

  const seen = new Set<string>();
  for (const h of headers) {
    if (h === "") continue;
    if (seen.has(h)) return fileError(`Duplicate column "${h}" in the header row.`);
    seen.add(h);
  }

  const missing = REQUIRED_RULE_COLUMNS.filter((c) => !seen.has(c));
  if (missing.length > 0) {
    return fileError(
      `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
    );
  }

  const dataCount = records.length - 1;
  if (dataCount === 0) return fileError("No data rows found.");
  if (dataCount > MAX_ROWS) {
    return fileError(`Too many rows: ${dataCount}. The limit is ${MAX_ROWS}.`);
  }

  const rows: RuleFields[] = [];
  const errors: RowError[] = [];

  for (let r = 1; r < records.length; r++) {
    const line = r + 1; // +1 for the header line (header = line 1)
    const cells = records[r];
    const payload: Record<string, string> = {};
    headers.forEach((h, c) => {
      if (KNOWN.has(h)) payload[h] = (cells[c] ?? "").trim();
    });

    const parsed = parseRulePayload(payload);
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      for (const [column, message] of Object.entries(parsed.errors)) {
        errors.push({ row: line, column, message });
      }
      if (parsed.formError) {
        errors.push({ row: line, column: "row", message: parsed.formError });
      }
    }
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true, rows };
}

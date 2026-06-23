import { z } from "zod";
import {
  PLAN_STRUCTURES,
  PLAN_TYPES,
  US_STATES,
} from "../eligibility/constants";
import type { EligibilityQuery } from "../eligibility/types";

/** Hard cap on a single batch — keeps the server action fast and its payload small. */
export const MAX_ROWS = 500;

/** Case-insensitive lookup that returns the canonical constant value (or null). */
function canonical(value: string, allowed: string[]): string | null {
  const v = value.trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === v) ?? null;
}

/**
 * One query row: payer is free text (an unknown payer is a valid no-match
 * result, not an error); plan_type/plan_structure are matched case-insensitively
 * and mapped to their canonical value; service_state is a single uppercased
 * US state code.
 */
const queryRowSchema = z.object({
  payer_group: z.string().trim().min(1, "Payer is required"),
  plan_type: z
    .string()
    .trim()
    .transform((v) => canonical(v, PLAN_TYPES) ?? v)
    .refine((v) => PLAN_TYPES.includes(v), {
      message: `Must be one of: ${PLAN_TYPES.join(", ")}`,
    }),
  plan_structure: z
    .string()
    .trim()
    .transform((v) => canonical(v, PLAN_STRUCTURES) ?? v)
    .refine((v) => PLAN_STRUCTURES.includes(v), {
      message: `Must be one of: ${PLAN_STRUCTURES.join(", ")}`,
    }),
  service_state: z
    .string()
    .trim()
    .refine((v) => !v.includes(","), {
      message: "A single US state only (e.g. CA), not a list",
    })
    .transform((v) => v.toUpperCase())
    .refine((v) => US_STATES.includes(v), {
      message: "Must be a valid US state code (e.g. CA)",
    }),
});

export type RowError = { row: number; column: string; message: string };

export type ParseRowsResult =
  | { success: true; queries: EligibilityQuery[] }
  | { success: false; errors: RowError[] };

/**
 * Validate an array of raw rows (from CSV or JSON) into clean EligibilityQuery
 * objects. Collects every error across every row (no short-circuit) so the
 * reject-whole-file UX can list them all. `row` is the 1-based spreadsheet line
 * (header = line 1, so the first data row = line 2).
 */
export function parseQueryRows(rows: unknown[]): ParseRowsResult {
  if (rows.length === 0) {
    return {
      success: false,
      errors: [{ row: 0, column: "file", message: "No data rows found." }],
    };
  }
  if (rows.length > MAX_ROWS) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          column: "file",
          message: `Too many rows: ${rows.length}. The limit is ${MAX_ROWS}.`,
        },
      ],
    };
  }

  const queries: EligibilityQuery[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, i) => {
    const line = i + 2; // +1 for 0-index, +1 for the header line
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      errors.push({ row: line, column: "row", message: "Expected an object." });
      return;
    }
    const result = queryRowSchema.safeParse(raw);
    if (result.success) {
      queries.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: line,
          column: String(issue.path[0] ?? "row"),
          message: issue.message,
        });
      }
    }
  });

  if (errors.length > 0) return { success: false, errors };
  return { success: true, queries };
}

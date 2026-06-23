import { z } from "zod";
import {
  OUTCOME_KEYS,
  OUTCOME_VALUES,
  PLAN_STRUCTURES,
  PLAN_TYPES,
  US_STATES,
} from "@/lib/eligibility/constants";
import type { OutcomeKey } from "@/lib/eligibility/types";
import type { EligibilityTestInput, ExpectedOutcomes } from "./types";

/**
 * Allowed expected values per outcome column — the authorable values minus the
 * "*" wildcard (a test must assert a concrete outcome, not "any").
 */
export const EXPECTED_VALUES: Record<OutcomeKey, string[]> = Object.fromEntries(
  OUTCOME_KEYS.map((k) => [k, OUTCOME_VALUES[k].filter((v) => v !== "*")]),
) as Record<OutcomeKey, string[]>;

/** Hard cap on a single upload — keeps the action fast and the payload small. */
export const MAX_TEST_ROWS = 500;

/** Case-insensitive lookup returning the canonical constant value (or null). */
function canonical(value: string, allowed: string[]): string | null {
  const v = value.trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === v) ?? null;
}

/** A flat outcome field constrained (case-insensitively) to its allowed set. */
function expectedField(key: OutcomeKey) {
  const allowed = EXPECTED_VALUES[key];
  return z
    .string()
    .trim()
    .transform((v) => canonical(v, allowed) ?? v)
    .refine((v) => allowed.includes(v), {
      message: `Must be one of: ${allowed.join(", ")}`,
    });
}

/**
 * The flat wire shape shared by the editor form, the JSON editor, and CSV/JSON
 * upload. Inputs mirror the eligibility checker (payer is free text — an unknown
 * payer is a legitimate "no rule matched" case); expected_* are the asserted
 * outcomes.
 */
const testSchema = z.object({
  name: z.string().trim().min(1, "A name is required"),
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
  expected_serviceable: expectedField("serviceable"),
  expected_pre_auth_required: expectedField("pre_auth_required"),
  expected_referral_required: expectedField("referral_required"),
  expected_preventative_coverage: expectedField("preventative_coverage"),
  notes: z.string().trim().default(""),
});

export type TestPayloadInput = z.input<typeof testSchema>;

export type ParseTestResult =
  | { success: true; data: EligibilityTestInput }
  | { success: false; errors: Record<string, string>; formError?: string };

/** Map the validated flat shape into the nested {@link EligibilityTestInput}. */
function toInput(flat: z.output<typeof testSchema>): EligibilityTestInput {
  const expected: ExpectedOutcomes = {
    serviceable: flat.expected_serviceable,
    pre_auth_required: flat.expected_pre_auth_required,
    referral_required: flat.expected_referral_required,
    preventative_coverage: flat.expected_preventative_coverage,
  };
  return {
    name: flat.name,
    payer_group: flat.payer_group,
    plan_type: flat.plan_type,
    plan_structure: flat.plan_structure,
    service_state: flat.service_state,
    expected,
    notes: flat.notes,
  };
}

/** Validate an untyped payload (from the form or JSON) into a test input. */
export function parseTestPayload(input: unknown): ParseTestResult {
  const result = testSchema.safeParse(input);
  if (result.success) return { success: true, data: toInput(result.data) };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}

export type RowError = { row: number; column: string; message: string };

export type ParseTestRowsResult =
  | { success: true; tests: EligibilityTestInput[] }
  | { success: false; errors: RowError[] };

/**
 * Validate raw rows (from CSV or JSON) into clean test inputs. Collects every
 * error across every row (no short-circuit) so the reject-whole-file UX can list
 * them all. `row` is the 1-based spreadsheet line (header = line 1).
 */
export function parseTestRows(rows: unknown[]): ParseTestRowsResult {
  if (rows.length === 0) {
    return {
      success: false,
      errors: [{ row: 0, column: "file", message: "No data rows found." }],
    };
  }
  if (rows.length > MAX_TEST_ROWS) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          column: "file",
          message: `Too many rows: ${rows.length}. The limit is ${MAX_TEST_ROWS}.`,
        },
      ],
    };
  }

  const tests: EligibilityTestInput[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, i) => {
    const line = i + 2; // +1 for 0-index, +1 for the header line
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      errors.push({ row: line, column: "row", message: "Expected an object." });
      return;
    }
    const result = testSchema.safeParse(raw);
    if (result.success) {
      tests.push(toInput(result.data));
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
  return { success: true, tests };
}

import { z } from "zod";
import { OUTCOME_VALUES, PLAN_STRUCTURES, PLAN_TYPES } from "@/lib/eligibility/constants";
import type { Rule, RuleFields } from "@/lib/eligibility/types";

const WILDCARD = "*";

/** A match field: non-empty string (wildcard allowed). */
const matchField = z.string().trim().min(1, "Required (use * for any)");

/** An outcome field constrained to its allowed values. */
const outcomeField = (allowed: string[]) =>
  z
    .string()
    .trim()
    .refine((v) => allowed.includes(v), {
      message: `Must be one of: ${allowed.join(", ")}`,
    });

export const ruleFieldsSchema = z.object({
  payer_group: matchField,
  payer_id: z.string().trim().default(WILDCARD),
  plan_type: matchField.refine(
    (v) => v === WILDCARD || PLAN_TYPES.includes(v),
    { message: `Must be * or one of: ${PLAN_TYPES.join(", ")}` },
  ),
  group_number: z.string().trim().default(WILDCARD),
  plan_structure: matchField.refine(
    (v) => v === WILDCARD || PLAN_STRUCTURES.includes(v),
    { message: `Must be * or one of: ${PLAN_STRUCTURES.join(", ")}` },
  ),
  service_state: matchField,
  serviceable: outcomeField(OUTCOME_VALUES.serviceable),
  pre_auth_required: outcomeField(OUTCOME_VALUES.pre_auth_required),
  referral_required: outcomeField(OUTCOME_VALUES.referral_required),
  preventative_coverage: outcomeField(OUTCOME_VALUES.preventative_coverage),
  last_verified: z.string().trim().default(""),
  verified_by: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export type RuleFieldsInput = z.input<typeof ruleFieldsSchema>;

export type ParseResult =
  | { success: true; data: RuleFields }
  | { success: false; errors: Record<string, string>; formError?: string };

/** Validate an untyped payload (from the JSON editor or form) into RuleFields. */
export function parseRulePayload(input: unknown): ParseResult {
  const result = ruleFieldsSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data as RuleFields };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}

/** Parse a raw JSON string from the manual editor. */
export function parseRuleJson(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, errors: {}, formError: "Invalid JSON syntax." };
  }
  return parseRulePayload(parsed);
}

const MATCH_KEYS = [
  "payer_group",
  "payer_id",
  "plan_type",
  "group_number",
  "plan_structure",
  "service_state",
] as const;

export type RuleWarning = { level: "warning"; message: string };

/**
 * Non-blocking warnings surfaced in the preview step: an exact-match-key
 * duplicate, or a rule that conflicts with an existing one on outcomes.
 */
export function detectWarnings(
  candidate: RuleFields,
  existing: Rule[],
  selfId?: string,
): RuleWarning[] {
  const warnings: RuleWarning[] = [];
  const sameKey = existing.filter(
    (r) =>
      r.id !== selfId &&
      MATCH_KEYS.every((k) => r[k].trim() === candidate[k].trim()),
  );
  if (sameKey.length > 0) {
    warnings.push({
      level: "warning",
      message: `${sameKey.length} existing rule${
        sameKey.length > 1 ? "s" : ""
      } already match this exact payer/plan/state combination. Saving creates a duplicate that will be aggregated alongside it.`,
    });
  }
  return warnings;
}

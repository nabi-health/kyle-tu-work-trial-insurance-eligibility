import { OUTCOME_KEYS } from "../eligibility/constants";
import type { EligibilityResult } from "../eligibility/types";
import { toCsv } from "./csv";

/**
 * Output column order for an exported result row: the four inputs verbatim,
 * then the decision and the four outcome values, then match metadata. Inputs
 * come first so re-importing an export is itself valid template input. The raw
 * `decision` key (not the display label) is exported for round-trip stability.
 */
export const RESULT_COLUMNS = [
  "payer_group",
  "plan_type",
  "plan_structure",
  "service_state",
  "decision",
  "serviceable",
  "pre_auth_required",
  "referral_required",
  "preventative_coverage",
  "has_match",
  "matched_rule_count",
] as const;

/** Flatten one result into a flat string record keyed by RESULT_COLUMNS. */
export function resultToRow(result: EligibilityResult): Record<string, string> {
  const row: Record<string, string> = {
    ...result.query,
    decision: result.decision,
    has_match: String(result.hasMatch),
    matched_rule_count: String(result.matchedRules.length),
  };
  for (const key of OUTCOME_KEYS) {
    row[key] = result.outcomes[key].value;
  }
  return row;
}

/** Serialize a batch of results to CSV (input + output), round-trippable. */
export function resultsToCsv(results: EligibilityResult[]): string {
  return toCsv(results.map(resultToRow), RESULT_COLUMNS);
}

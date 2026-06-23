/**
 * Core domain types for the eligibility registry.
 * Field shape mirrors registry.json (the seed dataset) exactly.
 */

export const WILDCARD = "*";

/** The four eligibility outcome columns the checker reports. */
export type OutcomeKey =
  | "serviceable"
  | "pre_auth_required"
  | "referral_required"
  | "preventative_coverage";

/** Raw rule shape as stored in registry.json / the `rules` table. */
export interface RuleFields {
  payer_group: string;
  payer_id: string;
  plan_type: string;
  group_number: string;
  plan_structure: string;
  service_state: string;
  serviceable: string;
  pre_auth_required: string;
  referral_required: string;
  preventative_coverage: string;
  last_verified: string;
  verified_by: string;
  notes: string;
}

/** A rule with a stable identity, as used everywhere in the app. */
export interface Rule extends RuleFields {
  id: string;
}

/** The four inputs collected by the eligibility checker form. */
export interface EligibilityQuery {
  payer_group: string;
  plan_type: string;
  plan_structure: string;
  service_state: string;
}

/** Final go/no-go classification (SOP "Decision Logic"). */
export type Decision =
  | "guarantee" // ✅ Apply Nabi Guarantee
  | "guarantee_after_referral" // 🟡 Apply once referral received
  | "not_eligible" // 🔴 Not eligible
  | "needs_research"; // 🟡 Needs research

/** Aggregated value for one outcome column + the rules that produced it. */
export interface OutcomeResult {
  value: string;
  /** Ids of matched rules whose value equals the winning value (the "drivers"). */
  drivingRuleIds: string[];
}

export interface EligibilityResult {
  query: EligibilityQuery;
  outcomes: Record<OutcomeKey, OutcomeResult>;
  decision: Decision;
  /** All rules that matched the query, most-specific first. */
  matchedRules: Rule[];
  hasMatch: boolean;
}

import type { OutcomeKey } from "./types";

/**
 * SOP "New Aggregation Algorithm" — per-column priority, highest first.
 * When several rules match, each output column independently takes the
 * highest-priority value present across all matching rows.
 *
 * "*" / "" (wildcard / empty) is always lowest. "Unknown" is treated as an
 * uncertainty tier alongside "Needs Review" so it surfaces as needs-research.
 */
export const OUTCOME_PRIORITY: Record<OutcomeKey, string[]> = {
  serviceable: ["No", "Needs Review", "Yes", "*"],
  pre_auth_required: ["Yes", "Needs Review", "No", "*"],
  referral_required: ["Yes", "CA Referral", "Needs Review", "Unknown", "No", "*"],
  preventative_coverage: ["No", "Needs Review", "Unknown", "Yes", "*"],
};

/** Allowed values when authoring a rule, per column (for dropdowns). */
export const OUTCOME_VALUES: Record<OutcomeKey, string[]> = {
  serviceable: ["Yes", "No", "Needs Review", "*"],
  pre_auth_required: ["Yes", "No", "Needs Review", "*"],
  referral_required: ["Yes", "No", "CA Referral", "Unknown", "Needs Review", "*"],
  preventative_coverage: ["Yes", "No", "Unknown", "Needs Review", "*"],
};

export const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  serviceable: "Serviceable",
  pre_auth_required: "Pre-auth Required",
  referral_required: "Referral Required",
  preventative_coverage: "Preventative Coverage",
};

export const OUTCOME_KEYS: OutcomeKey[] = [
  "serviceable",
  "pre_auth_required",
  "referral_required",
  "preventative_coverage",
];

/** Input option sets (Notion §5 field definitions). */
export const PLAN_TYPES = ["Commercial", "Medicare", "Medicaid", "Individual"];
export const PLAN_STRUCTURES = ["PPO", "HMO", "EPO", "POS", "HDHP"];

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

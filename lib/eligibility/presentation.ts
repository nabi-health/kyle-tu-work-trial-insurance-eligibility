import type { Tone } from "@/components/ui/Badge";
import type { Decision, OutcomeKey } from "./types";

/**
 * Per-column value semantics → badge tone. The same value means different
 * things per column (serviceable "No" is bad; pre-auth "No" is good), so tone
 * is decided by (column, value), not value alone.
 */
const POSITIVE: Record<OutcomeKey, string> = {
  serviceable: "Yes",
  pre_auth_required: "No",
  referral_required: "No",
  preventative_coverage: "Yes",
};

const NEGATIVE: Record<OutcomeKey, string> = {
  serviceable: "No",
  pre_auth_required: "Yes",
  referral_required: "Yes",
  preventative_coverage: "No",
};

export function outcomeTone(key: OutcomeKey, value: string): Tone {
  if (value === POSITIVE[key]) return "success";
  if (value === NEGATIVE[key]) return key === "serviceable" || key === "preventative_coverage" ? "danger" : "warning";
  if (value === "CA Referral") return "warning";
  // Needs Review / Unknown / anything uncertain.
  return "warning";
}

export type DecisionDisplay = {
  label: string;
  tone: Tone;
  icon: string;
  blurb: string;
};

export const DECISION_DISPLAY: Record<Decision, DecisionDisplay> = {
  guarantee: {
    label: "Apply Nabi Guarantee",
    tone: "success",
    icon: "✓",
    blurb: "Serviceable with preventative coverage and no referral needed.",
  },
  guarantee_after_referral: {
    label: "Apply Guarantee once referral received",
    tone: "warning",
    icon: "↻",
    blurb: "Serviceable, but a referral must be in hand before the guarantee applies.",
  },
  not_eligible: {
    label: "Not Eligible",
    tone: "danger",
    icon: "✕",
    blurb: "We can't see this patient — not serviceable or no preventative coverage.",
  },
  needs_research: {
    label: "Needs Research",
    tone: "warning",
    icon: "?",
    blurb: "At least one outcome is uncertain. Verify before giving the patient an answer.",
  },
};

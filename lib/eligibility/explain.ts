import { OUTCOME_KEYS, OUTCOME_LABELS } from "./constants";
import type { Decision, EligibilityResult, OutcomeKey, Rule } from "./types";

/** Values that mark a column as uncertain (drive the needs_research branch). */
const UNCERTAIN = ["Needs Review", "Unknown"];

export type DecidingReason = "blocked" | "uncertain" | "referral" | "clean";

export interface DecidingColumns {
  decision: Decision;
  /** Columns the user should look at to understand the decision; [] when clean. */
  keys: OutcomeKey[];
  reason: DecidingReason;
}

/**
 * Which outcome column(s) drove the final decision. Mirrors decide()'s branch
 * order in engine.ts so the named columns always match the branch that fired.
 */
export function decidingColumns(result: EligibilityResult): DecidingColumns {
  const { decision, outcomes } = result;
  const val = (k: OutcomeKey) => outcomes[k].value;

  switch (decision) {
    case "not_eligible": {
      // Hard no-go: serviceable No and/or preventative No (one or both).
      const keys = (
        ["serviceable", "preventative_coverage"] as OutcomeKey[]
      ).filter((k) => val(k) === "No");
      return { decision, keys, reason: "blocked" };
    }
    case "needs_research": {
      const keys = OUTCOME_KEYS.filter((k) => UNCERTAIN.includes(val(k)));
      return { decision, keys, reason: "uncertain" };
    }
    case "guarantee_after_referral":
      return { decision, keys: ["referral_required"], reason: "referral" };
    case "guarantee":
    default:
      // Clean path — no column overrode anything; nothing to single out.
      return { decision, keys: [], reason: "clean" };
  }
}

const display = (v: string) => (v.trim() === "" || v.trim() === "*" ? "Any" : v);

/** Compact identity for a driver rule, e.g. "Aetna · PPO". */
function ruleLabel(rule: Rule): string {
  return `${display(rule.payer_group)} · ${display(rule.plan_structure)}`;
}

/** Driver rules behind the given columns, de-duplicated and resolved to Rules. */
function driversFor(result: EligibilityResult, keys: OutcomeKey[]): Rule[] {
  const byId = new Map(result.matchedRules.map((r) => [r.id, r]));
  const ids = new Set(keys.flatMap((k) => result.outcomes[k].drivingRuleIds));
  return [...ids]
    .map((id) => byId.get(id))
    .filter((r): r is Rule => r !== undefined);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Aetna · PPO, Cigna · HMO, +1 more" — names up to 2, counts the rest. */
function namesList(rules: Rule[]): string {
  const shown = rules.slice(0, 2).map(ruleLabel);
  const extra = rules.length - shown.length;
  return extra > 0 ? `${shown.join(", ")}, +${extra} more` : shown.join(", ");
}

/** Join clauses with serial-comma "and": "a", "a and b", "a, b, and c". */
function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** Trailing "set by N rules (names)" clause, or "" when there are no drivers. */
function setByClause(rules: Rule[]): string {
  if (rules.length === 0) return "";
  return `, set by ${plural(rules.length, "rule")} (${namesList(rules)})`;
}

/**
 * A deterministic, plain-English explanation of why the decision came out as it
 * did — names the deciding column(s) and the rule(s) that carried them. Pure
 * and presentation-free; callers gate on result.hasMatch (the no-match case has
 * its own dedicated panel).
 */
export function explainDecision(result: EligibilityResult): string {
  const { keys, reason } = decidingColumns(result);
  const val = (k: OutcomeKey) => result.outcomes[k].value;

  switch (reason) {
    case "blocked": {
      const cols = joinAnd(keys.map((k) => `${OUTCOME_LABELS[k]} is No`));
      return `Not Eligible because ${cols}${setByClause(driversFor(result, keys))}.`;
    }
    case "uncertain": {
      const cols = joinAnd(keys.map((k) => `${OUTCOME_LABELS[k]} is ${val(k)}`));
      return `Needs Research because ${cols} — verify before giving the patient an answer.`;
    }
    case "referral":
      return `Apply the guarantee once a referral is received — Referral Required is ${val(
        "referral_required",
      )}${setByClause(driversFor(result, keys))}.`;
    case "clean":
    default:
      return "Apply the Nabi Guarantee — serviceable with preventative coverage and no referral required.";
  }
}

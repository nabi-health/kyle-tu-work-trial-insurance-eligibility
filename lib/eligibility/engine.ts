import { OUTCOME_KEYS, OUTCOME_PRIORITY } from "./constants";
import {
  type Decision,
  type EligibilityQuery,
  type EligibilityResult,
  type OutcomeKey,
  type OutcomeResult,
  type Rule,
  WILDCARD,
} from "./types";

const isWildcard = (v: string) => v.trim() === "" || v.trim() === WILDCARD;

const norm = (v: string) => v.trim().toLowerCase();

/** A single-value rule field matches the query value (wildcard = any). */
function fieldMatches(ruleValue: string, queryValue: string): boolean {
  return isWildcard(ruleValue) || norm(ruleValue) === norm(queryValue);
}

/** service_state is a CSV list (e.g. "CA,WA"); membership = match. */
function stateMatches(ruleState: string, queryState: string): boolean {
  if (isWildcard(ruleState)) return true;
  const q = norm(queryState);
  return ruleState.split(",").some((s) => norm(s) === q);
}

/** SOP Step 1 — Matching. A rule matches when all four inputs match. */
export function matchRules(query: EligibilityQuery, rules: Rule[]): Rule[] {
  return rules.filter(
    (r) =>
      fieldMatches(r.payer_group, query.payer_group) &&
      fieldMatches(r.plan_type, query.plan_type) &&
      fieldMatches(r.plan_structure, query.plan_structure) &&
      stateMatches(r.service_state, query.service_state),
  );
}

/** Count of non-wildcard match fields — used only to order rules for display. */
function specificity(rule: Rule): number {
  return [
    rule.payer_group,
    rule.plan_type,
    rule.plan_structure,
    rule.service_state,
  ].filter((v) => !isWildcard(v)).length;
}

/** Priority rank of a value within a column (lower index = higher priority). */
function rank(key: OutcomeKey, value: string): number {
  const order = OUTCOME_PRIORITY[key];
  const v = isWildcard(value) ? WILDCARD : value.trim();
  const i = order.indexOf(v);
  // Unknown values fall to the bottom (treated as wildcard tier).
  return i === -1 ? order.length : i;
}

/**
 * SOP Step 2 — Aggregation. For one column, pick the highest-priority value
 * across all matching rows. Records which rules drove that value.
 * No matches, or an aggregate that resolves to "*", becomes "Needs Review".
 */
function aggregateColumn(key: OutcomeKey, matches: Rule[]): OutcomeResult {
  if (matches.length === 0) {
    return { value: "Needs Review", drivingRuleIds: [] };
  }

  let bestRank = Infinity;
  let bestValue = WILDCARD;
  for (const rule of matches) {
    const r = rank(key, rule[key]);
    if (r < bestRank) {
      bestRank = r;
      bestValue = isWildcard(rule[key]) ? WILDCARD : rule[key].trim();
    }
  }

  // A winning "*" (every matching rule was wildcard here) → Needs Review.
  const value = bestValue === WILDCARD ? "Needs Review" : bestValue;

  const drivingRuleIds = matches
    .filter((rule) => rank(key, rule[key]) === bestRank)
    .map((rule) => rule.id);

  return { value, drivingRuleIds };
}

/** SOP Step 3 — Decision Logic (the Nabi Guarantee). */
export function decide(outcomes: Record<OutcomeKey, OutcomeResult>): Decision {
  const serviceable = outcomes.serviceable.value;
  const referral = outcomes.referral_required.value;
  const preventative = outcomes.preventative_coverage.value;

  // Hard no-go first: cannot service, or no preventative coverage.
  if (serviceable === "No" || preventative === "No") return "not_eligible";

  // Any uncertainty across the outcomes → research before deciding.
  const uncertain = OUTCOME_KEYS.some((k) =>
    ["Needs Review", "Unknown"].includes(outcomes[k].value),
  );
  if (uncertain) return "needs_research";

  // Clean path: serviceable + preventative are Yes.
  if (referral === "No") return "guarantee";
  // "Yes" or "CA Referral" — guarantee applies once the referral is in hand.
  return "guarantee_after_referral";
}

/** Full evaluation: match → aggregate → decide. Pure and deterministic. */
export function evaluate(
  query: EligibilityQuery,
  rules: Rule[],
): EligibilityResult {
  const matched = matchRules(query, rules).sort(
    (a, b) => specificity(b) - specificity(a),
  );

  const outcomes = Object.fromEntries(
    OUTCOME_KEYS.map((key) => [key, aggregateColumn(key, matched)]),
  ) as Record<OutcomeKey, OutcomeResult>;

  return {
    query,
    outcomes,
    decision: decide(outcomes),
    matchedRules: matched,
    hasMatch: matched.length > 0,
  };
}

import {
  PLAN_STRUCTURES,
  PLAN_TYPES,
  US_STATES,
} from "../eligibility/constants";
import {
  type EligibilityQuery,
  type Rule,
  WILDCARD,
} from "../eligibility/types";

const isWild = (v: string) => v.trim() === "" || v.trim() === WILDCARD;

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * Build N concrete example queries that each match a real registry rule, so the
 * sandbox produces interesting (mostly non-default) results instead of random
 * no-matches. A rule's concrete fields are used verbatim; wildcard fields are
 * filled with a random allowed value, and a rule's state list contributes one
 * of its states. `rand` is injectable for deterministic tests.
 */
export function sampleQueriesFromRules(
  rules: Rule[],
  n: number,
  rand: () => number = Math.random,
): EligibilityQuery[] {
  if (rules.length === 0 || n <= 0) return [];

  // Concrete payers seen in the registry, for filling wildcard payer fields.
  const payers = [
    ...new Set(rules.map((r) => r.payer_group).filter((p) => !isWild(p))),
  ];
  const payerPool = payers.length > 0 ? payers : ["Aetna", "Cigna", "Humana"];

  const queries: EligibilityQuery[] = [];
  for (let i = 0; i < n; i++) {
    const rule = pick(rules, rand);
    const states = isWild(rule.service_state)
      ? US_STATES
      : rule.service_state
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
    queries.push({
      payer_group: isWild(rule.payer_group)
        ? pick(payerPool, rand)
        : rule.payer_group,
      plan_type: isWild(rule.plan_type) ? pick(PLAN_TYPES, rand) : rule.plan_type,
      plan_structure: isWild(rule.plan_structure)
        ? pick(PLAN_STRUCTURES, rand)
        : rule.plan_structure,
      service_state: pick(states.length > 0 ? states : US_STATES, rand),
    });
  }
  return queries;
}

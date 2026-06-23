import { z } from "zod";
import {
  OUTCOME_KEYS,
  OUTCOME_VALUES,
  PLAN_STRUCTURES,
  PLAN_TYPES,
} from "../eligibility/constants";
import type { OutcomeKey, Rule, RuleFields } from "../eligibility/types";

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

/**
 * Canonical key for a rule's match criteria — the "exact inputs" a rule keys
 * off. service_state is a set, so its order doesn't matter ("CA,WA" == "WA,CA").
 * Two rules with the same key target the exact same combination of inputs.
 */
function matchCriteriaKey(r: RuleFields): string {
  return MATCH_KEYS.map((k) => {
    const v = r[k].trim().toLowerCase();
    if (k === "service_state") {
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .sort()
        .join(",");
    }
    return v;
  }).join("|");
}

/** Two rules target the exact same match criteria (the only invariant). */
function sameMatchCriteria(a: RuleFields, b: RuleFields): boolean {
  return matchCriteriaKey(a) === matchCriteriaKey(b);
}

const isOutcomeWildcard = (v: string) => {
  const t = v.trim();
  return t === "" || t === "*";
};

/**
 * The outcome columns on which two rules actively disagree: both name a
 * concrete (non-wildcard) value and those values differ. Wildcards don't
 * conflict — they defer to the other rule.
 */
function conflictingOutcomes(a: RuleFields, b: RuleFields): OutcomeKey[] {
  return OUTCOME_KEYS.filter((k) => {
    const av = a[k];
    const bv = b[k];
    if (isOutcomeWildcard(av) || isOutcomeWildcard(bv)) return false;
    return av.trim().toLowerCase() !== bv.trim().toLowerCase();
  });
}

/** A pair of rules with the same match criteria whose outcomes disagree. */
export type RuleConflict = { a: Rule; b: Rule; outcomes: OutcomeKey[] };

/** The result of auditing the whole registry for self-inconsistency. */
export type RegistryValidation = {
  /** Groups of rules sharing the exact same match criteria, outcomes aligned. */
  duplicates: Rule[][];
  /** Same-criteria rule pairs that disagree on one or more outcomes. */
  conflicts: RuleConflict[];
};

/** Group rules that share the exact same match criteria (size ≥ 2 only). */
function groupByCriteria(rules: Rule[]): Rule[][] {
  const groups = new Map<string, Rule[]>();
  for (const rule of rules) {
    const key = matchCriteriaKey(rule);
    const group = groups.get(key);
    if (group) group.push(rule);
    else groups.set(key, [rule]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Does any pair within a same-criteria group disagree on outcomes? */
function groupHasConflict(group: Rule[]): boolean {
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (conflictingOutcomes(group[i], group[j]).length > 0) return true;
    }
  }
  return false;
}

/**
 * Pure-duplicate groups: multiple rules on the exact same criteria whose
 * outcomes don't contradict — redundant rows. (A group whose outcomes DO
 * contradict is reported as a conflict instead.)
 */
export function findDuplicateGroups(rules: Rule[]): Rule[][] {
  return groupByCriteria(rules).filter((g) => !groupHasConflict(g));
}

/**
 * Conflicts: rule pairs that share the exact same match criteria but disagree
 * on outcomes — the same inputs can't have two answers. Overlapping-but-not-
 * identical criteria (e.g. a state-specific rule beside a wildcard one) are NOT
 * conflicts; the priority aggregator resolves those by design.
 */
export function findConflicts(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  for (const group of groupByCriteria(rules)) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const outcomes = conflictingOutcomes(group[i], group[j]);
        if (outcomes.length > 0) {
          conflicts.push({ a: group[i], b: group[j], outcomes });
        }
      }
    }
  }
  return conflicts;
}

/** Audit the whole registry for duplicate and conflicting rules. */
export function validateRegistry(rules: Rule[]): RegistryValidation {
  return {
    duplicates: findDuplicateGroups(rules),
    conflicts: findConflicts(rules),
  };
}

export type RuleWarning = { level: "warning"; message: string };

/**
 * Non-blocking warnings surfaced in the preview step. The one invariant we
 * enforce: a rule's match criteria must be unique. If another rule already
 * uses these exact inputs we warn — flagging it as a conflict when the outcomes
 * also disagree, or a plain duplicate when they don't.
 */
export function detectWarnings(
  candidate: RuleFields,
  existing: Rule[],
  selfId?: string,
): RuleWarning[] {
  const warnings: RuleWarning[] = [];
  const sameCriteria = existing.filter(
    (r) => r.id !== selfId && sameMatchCriteria(r, candidate),
  );
  if (sameCriteria.length === 0) return warnings;

  const conflicting = sameCriteria.filter(
    (r) => conflictingOutcomes(candidate, r).length > 0,
  );
  if (conflicting.length > 0) {
    warnings.push({
      level: "warning",
      message: `This rule has the same match criteria as ${
        conflicting.length
      } existing rule${
        conflicting.length > 1 ? "s" : ""
      } but a different outcome — the same inputs can't have two answers. Resolve before saving.`,
    });
  } else {
    warnings.push({
      level: "warning",
      message: `${sameCriteria.length} existing rule${
        sameCriteria.length > 1 ? "s" : ""
      } already use this exact match criteria. Saving creates a duplicate that will be aggregated alongside it.`,
    });
  }

  return warnings;
}

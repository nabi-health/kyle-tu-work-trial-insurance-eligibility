"use server";

import { evaluate } from "@/lib/eligibility/engine";
import type { EligibilityQuery, EligibilityResult } from "@/lib/eligibility/types";
import { listRules } from "@/lib/rules/repository";
import { sampleQueriesFromRules } from "@/lib/check/sample";
import { MAX_ROWS } from "@/lib/check/validation";

/** Run an eligibility check against the live registry. */
export async function checkEligibility(
  query: EligibilityQuery,
): Promise<EligibilityResult> {
  const rules = await listRules();
  return evaluate(query, rules);
}

/**
 * Run many checks against the live registry in one pass. Loads the ruleset once
 * and maps the pure `evaluate` over each query. The row cap is enforced here as
 * a hard guard (a server action is a public endpoint) in addition to client-side.
 */
export async function checkEligibilityBatch(
  queries: EligibilityQuery[],
): Promise<EligibilityResult[]> {
  if (queries.length > MAX_ROWS) {
    throw new Error(`Too many rows: ${queries.length}. The limit is ${MAX_ROWS}.`);
  }
  const rules = await listRules();
  return queries.map((q) => evaluate(q, rules));
}

/**
 * Generate N random example queries that each match a real registry rule and
 * run them — a one-click way to populate the bulk sandbox with realistic data.
 */
export async function generateSampleResults(
  n: number,
): Promise<EligibilityResult[]> {
  const rules = await listRules();
  const queries = sampleQueriesFromRules(rules, Math.min(n, MAX_ROWS));
  return queries.map((q) => evaluate(q, rules));
}

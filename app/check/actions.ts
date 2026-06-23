"use server";

import { evaluate } from "@/lib/eligibility/engine";
import type { EligibilityQuery, EligibilityResult } from "@/lib/eligibility/types";
import { listRules } from "@/lib/rules/repository";

/** Run an eligibility check against the live registry. */
export async function checkEligibility(
  query: EligibilityQuery,
): Promise<EligibilityResult> {
  const rules = await listRules();
  return evaluate(query, rules);
}

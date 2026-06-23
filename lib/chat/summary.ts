/**
 * Compact, token-cheap summaries of bulk results fed back to the model as a
 * tool_result — never the full table (that goes to the UI). Counts by decision
 * plus a few example rows is enough for the assistant to write a useful prose
 * recap without re-emitting hundreds of rows.
 */
import { DECISION_DISPLAY } from "@/lib/eligibility/presentation";
import type { Decision, EligibilityResult } from "@/lib/eligibility/types";

const DECISIONS: Decision[] = [
  "guarantee",
  "guarantee_after_referral",
  "not_eligible",
  "needs_research",
];

/** "Aetna / Commercial / PPO / CA" — a one-line identity for an example row. */
function queryLabel(r: EligibilityResult): string {
  const { payer_group, plan_type, plan_structure, service_state } = r.query;
  return `${payer_group} / ${plan_type} / ${plan_structure} / ${service_state}`;
}

/**
 * A plain-text recap of a batch: total, a count per decision, how many had no
 * matching rule, and up to `examples` sample rows. Stable ordering so the same
 * batch always summarizes identically.
 */
export function summarizeResultsForModel(
  results: EligibilityResult[],
  examples = 5,
): string {
  if (results.length === 0) return "No rows were checked (the dataset was empty).";

  const counts = new Map<Decision, number>();
  for (const r of results) counts.set(r.decision, (counts.get(r.decision) ?? 0) + 1);
  const noMatch = results.filter((r) => !r.hasMatch).length;

  const lines = [`Checked ${results.length} member row${results.length === 1 ? "" : "s"} against the live registry.`];
  lines.push("Decisions:");
  for (const d of DECISIONS) {
    const n = counts.get(d) ?? 0;
    if (n > 0) lines.push(`- ${DECISION_DISPLAY[d].label}: ${n}`);
  }
  if (noMatch > 0) {
    lines.push(`${noMatch} row${noMatch === 1 ? "" : "s"} matched no rule (no-match).`);
  }

  const sample = results.slice(0, examples);
  if (sample.length > 0) {
    lines.push(`Examples (first ${sample.length}):`);
    for (const r of sample) {
      lines.push(`- ${queryLabel(r)} → ${DECISION_DISPLAY[r.decision].label}`);
    }
  }
  return lines.join("\n");
}

/** Plain-text recap of a confirmed/discarded bulk rule change, for tool_result. */
export function summarizeBulkResolution(
  resolution: "confirmed" | "discarded",
  opCount: number,
): string {
  if (resolution === "discarded") {
    return "The user discarded this bulk change. Nothing was written. Revise based on their next message, or ask what to change.";
  }
  return `The user accepted this bulk change. ${opCount} rule operation${
    opCount === 1 ? "" : "s"
  } were applied to the registry.`;
}

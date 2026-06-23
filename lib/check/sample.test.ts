import { describe, expect, it } from "vitest";
import registryData from "../../registry.json";
import { evaluate } from "../eligibility/engine";
import type { Rule, RuleFields } from "../eligibility/types";
import { sampleQueriesFromRules } from "./sample";

const REGISTRY: Rule[] = (registryData as RuleFields[]).map((r, i) => ({
  ...r,
  id: `seed-${i}`,
}));

/** Deterministic PRNG (mulberry32) so the test is stable. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("sampleQueriesFromRules", () => {
  it("returns exactly N queries", () => {
    expect(sampleQueriesFromRules(REGISTRY, 25, seeded(1))).toHaveLength(25);
  });

  it("every generated query matches at least one rule", () => {
    const queries = sampleQueriesFromRules(REGISTRY, 50, seeded(7));
    for (const q of queries) {
      expect(evaluate(q, REGISTRY).hasMatch).toBe(true);
    }
  });

  it("fills all four fields with non-empty values", () => {
    for (const q of sampleQueriesFromRules(REGISTRY, 10, seeded(3))) {
      expect(q.payer_group).not.toBe("");
      expect(q.plan_type).not.toBe("");
      expect(q.plan_structure).not.toBe("");
      expect(q.service_state).not.toBe("");
    }
  });

  it("is deterministic for a fixed rng", () => {
    expect(sampleQueriesFromRules(REGISTRY, 5, seeded(42))).toEqual(
      sampleQueriesFromRules(REGISTRY, 5, seeded(42)),
    );
  });

  it("returns nothing for no rules or non-positive n", () => {
    expect(sampleQueriesFromRules([], 25)).toEqual([]);
    expect(sampleQueriesFromRules(REGISTRY, 0)).toEqual([]);
  });
});

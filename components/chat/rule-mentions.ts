import { ruleCriteriaLabel } from "@/components/rules/rule-helpers";
import type { Rule } from "@/lib/eligibility/types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `[R12]` reference tokens — the short, easy-to-emit handles we give each rule in
 * the system prompt (1-based index into the rules list). The model copies these
 * reliably, unlike 36-char UUIDs.
 */
const TOKEN_RE = /\[R(\d+)\]/g;

/** Regex matching any raw rule id (optionally backtick-wrapped) — a fallback. */
function idRegex(ids: string[]): RegExp | null {
  if (ids.length === 0) return null;
  const alt = ids
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join("|");
  return new RegExp("`?\\b(" + alt + ")\\b`?", "g");
}

/**
 * Rules the assistant referenced in `text`, in first-seen order, deduped.
 * Resolves `[R#]` tokens by index and also matches raw ids as a fallback.
 */
export function referencedRules(text: string, rules: Rule[]): Rule[] {
  const out: Rule[] = [];
  const seen = new Set<string>();
  const add = (rule: Rule | undefined) => {
    if (rule && !seen.has(rule.id)) {
      seen.add(rule.id);
      out.push(rule);
    }
  };

  for (const m of text.matchAll(TOKEN_RE)) {
    add(rules[Number(m[1]) - 1]);
  }

  const byId = new Map(rules.map((r) => [r.id, r]));
  const re = idRegex([...byId.keys()]);
  if (re) {
    for (const m of text.matchAll(re)) add(byId.get(m[1]));
  }

  return out;
}

/**
 * Replace `[R#]` tokens (and any raw ids) in `text` with the rule's legible
 * criteria label, so the prose reads naturally. The full rule object is rendered
 * separately as a card in the thread.
 */
export function relabelRuleMentions(text: string, rules: Rule[]): string {
  let out = text.replace(TOKEN_RE, (match, n) => {
    const rule = rules[Number(n) - 1];
    return rule ? ruleCriteriaLabel(rule) : match;
  });

  const byId = new Map(rules.map((r) => [r.id, r]));
  const re = idRegex([...byId.keys()]);
  if (re) {
    out = out.replace(re, (match, id) => {
      const rule = byId.get(id);
      return rule ? ruleCriteriaLabel(rule) : match;
    });
  }

  return out;
}

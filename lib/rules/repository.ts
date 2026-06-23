import "server-only";
import seedData from "../../registry.json";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  AuditAction,
  AuditEntry,
  Rule,
  RuleFields,
} from "@/lib/eligibility/types";

const TABLE = "rules";

const AUDIT_COLUMNS = "id,rule_id,action,actor,before,after,created_at";

const RULE_COLUMNS =
  "id,payer_group,payer_id,plan_type,group_number,plan_structure,service_state,serviceable,pre_auth_required,referral_required,preventative_coverage,last_verified,verified_by,notes";

/* ------------------------------------------------------------------ *
 * Local in-memory store. Used when Supabase isn't configured, and as a
 * graceful fallback when it's configured but unreachable / not yet
 * migrated (so the app keeps working before `setup.sql` is run).
 * Seeded from registry.json; mutations persist for the server lifetime.
 * ------------------------------------------------------------------ */
let memory: Rule[] | null = null;
const auditMemory: AuditEntry[] = [];
let warnedFallback = false;

function store(): Rule[] {
  if (memory === null) {
    memory = (seedData as RuleFields[]).map((r, i) => ({ ...r, id: `seed-${i}` }));
  }
  return memory;
}

function memoryList(): Rule[] {
  return [...store()].sort((a, b) => a.payer_group.localeCompare(b.payer_group));
}

function warnFallback(op: string, err: unknown) {
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      `[rules] Supabase unavailable (${op}: ${
        err instanceof Error ? err.message : String(err)
      }). Falling back to the local registry.json seed. Run supabase/setup.sql to use the database.`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Public repository API. Tries Supabase when configured; falls back to
 * the local store on any failure so the UI never hard-errors.
 * ------------------------------------------------------------------ */

export async function listRules(): Promise<Rule[]> {
  const db = getSupabaseAdmin();
  if (!db) return memoryList();
  try {
    const { data, error } = await db
      .from(TABLE)
      .select(RULE_COLUMNS)
      .order("payer_group", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Rule[];
  } catch (err) {
    warnFallback("listRules", err);
    return memoryList();
  }
}

export async function getRule(id: string): Promise<Rule | null> {
  const db = getSupabaseAdmin();
  if (!db) return store().find((r) => r.id === id) ?? null;
  try {
    const { data, error } = await db
      .from(TABLE)
      .select(RULE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Rule) ?? null;
  } catch (err) {
    warnFallback("getRule", err);
    return store().find((r) => r.id === id) ?? null;
  }
}

export async function createRule(fields: RuleFields): Promise<Rule> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { data, error } = await db
        .from(TABLE)
        .insert(fields)
        .select(RULE_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      await logAudit("create", (data as Rule).id, null, fields);
      return data as Rule;
    } catch (err) {
      warnFallback("createRule", err);
    }
  }
  const rule: Rule = { ...fields, id: crypto.randomUUID() };
  store().push(rule);
  await logAudit("create", rule.id, null, fields);
  return rule;
}

export async function updateRule(id: string, fields: RuleFields): Promise<Rule> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const before = await getRule(id);
      const { data, error } = await db
        .from(TABLE)
        .update(fields)
        .eq("id", id)
        .select(RULE_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      await logAudit("update", id, before, fields);
      return data as Rule;
    } catch (err) {
      warnFallback("updateRule", err);
    }
  }
  const list = store();
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) throw new Error("Rule not found");
  const before = stripIdentity(list[i]);
  list[i] = { ...fields, id };
  await logAudit("update", id, before, fields);
  return list[i];
}

export async function deleteRule(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const before = await getRule(id);
      const { error } = await db.from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit("delete", id, before, null);
      return;
    } catch (err) {
      warnFallback("deleteRule", err);
    }
  }
  const before = store().find((r) => r.id === id);
  memory = store().filter((r) => r.id !== id);
  await logAudit("delete", id, before ? stripIdentity(before) : null, null);
}

/** Drop the synthetic id to get a bare field snapshot for the audit log. */
function stripIdentity(rule: Rule): RuleFields {
  const copy: Partial<Rule> = { ...rule };
  delete copy.id;
  return copy as RuleFields;
}

/** Distinct payer groups (excluding wildcard) for the checker dropdown. */
export async function listPayerGroups(): Promise<string[]> {
  const rules = await listRules();
  const set = new Set<string>();
  for (const r of rules) {
    const pg = r.payer_group.trim();
    if (pg && pg !== "*") set.add(pg);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Most-recent-first change history for one rule. */
export async function listRuleHistory(ruleId: string): Promise<AuditEntry[]> {
  const db = getSupabaseAdmin();
  if (!db) {
    return auditMemory
      .filter((e) => e.rule_id === ruleId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  try {
    const { data, error } = await db
      .from("audit_log")
      .select(AUDIT_COLUMNS)
      .eq("rule_id", ruleId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AuditEntry[];
  } catch (err) {
    warnFallback("listRuleHistory", err);
    return auditMemory
      .filter((e) => e.rule_id === ruleId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

async function logAudit(
  action: AuditAction,
  ruleId: string,
  before: RuleFields | null,
  after: RuleFields | null,
): Promise<void> {
  // "Who" — the saver stamps verified_by; fall back to the prior value, then a
  // generic ops actor. (No real auth layer in this tool.)
  const actor =
    (after?.verified_by || before?.verified_by || "").trim() || "ops";
  const db = getSupabaseAdmin();
  if (db) {
    // Best-effort: never let audit failures block the primary mutation.
    await db
      .from("audit_log")
      .insert({ rule_id: ruleId, action, actor, before, after })
      .then(undefined, () => undefined);
    return;
  }
  auditMemory.push({
    id: `audit-${auditMemory.length}`,
    rule_id: ruleId,
    action,
    actor,
    before,
    after,
    created_at: new Date().toISOString(),
  });
}

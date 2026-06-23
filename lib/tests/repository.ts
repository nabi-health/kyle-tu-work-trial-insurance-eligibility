import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { SEED_TESTS } from "./seed";
import type { EligibilityTest, EligibilityTestInput } from "./types";

const TABLE = "eligibility_tests";
const COLUMNS =
  "id,name,payer_group,plan_type,plan_structure,service_state,expected_serviceable,expected_pre_auth_required,expected_referral_required,expected_preventative_coverage,notes,created_at";

/* ------------------------------------------------------------------ *
 * In-memory fallback — used when Supabase isn't configured, and as a
 * graceful fallback when it's configured but the eligibility_tests table
 * hasn't been migrated yet (so the page keeps working before setup.sql /
 * migration 0003 is run). Seeded from SEED_TESTS; mutations persist for
 * the server lifetime.
 * ------------------------------------------------------------------ */
let memory: EligibilityTest[] | null = null;
let warned = false;

function store(): EligibilityTest[] {
  if (memory === null) {
    memory = SEED_TESTS.map((t, i) => ({ ...t, id: `seed-test-${i}` }));
  }
  return memory;
}

function memList(): EligibilityTest[] {
  return [...store()];
}

function warn(op: string, err: unknown) {
  if (warned) return;
  warned = true;
  console.warn(
    `[tests] Supabase unavailable (${op}: ${
      err instanceof Error ? err.message : String(err)
    }). Falling back to in-memory test cases. Run supabase/setup.sql (or migration 0003) to persist.`,
  );
}

/** A flat DB row (expected_* columns) → the nested {@link EligibilityTest}. */
interface Row {
  id: string;
  name: string;
  payer_group: string;
  plan_type: string;
  plan_structure: string;
  service_state: string;
  expected_serviceable: string;
  expected_pre_auth_required: string;
  expected_referral_required: string;
  expected_preventative_coverage: string;
  notes: string;
  created_at?: string;
}

function mapRow(row: Row): EligibilityTest {
  return {
    id: row.id,
    name: row.name,
    payer_group: row.payer_group,
    plan_type: row.plan_type,
    plan_structure: row.plan_structure,
    service_state: row.service_state,
    expected: {
      serviceable: row.expected_serviceable,
      pre_auth_required: row.expected_pre_auth_required,
      referral_required: row.expected_referral_required,
      preventative_coverage: row.expected_preventative_coverage,
    },
    notes: row.notes,
  };
}

/** The nested input → a flat row for insert/update. */
function toRow(input: EligibilityTestInput): Omit<Row, "id" | "created_at"> {
  return {
    name: input.name,
    payer_group: input.payer_group,
    plan_type: input.plan_type,
    plan_structure: input.plan_structure,
    service_state: input.service_state,
    expected_serviceable: input.expected.serviceable,
    expected_pre_auth_required: input.expected.pre_auth_required,
    expected_referral_required: input.expected.referral_required,
    expected_preventative_coverage: input.expected.preventative_coverage,
    notes: input.notes,
  };
}

/** All test cases, oldest first (stable authoring order). */
export async function listTests(): Promise<EligibilityTest[]> {
  const db = getSupabaseAdmin();
  if (!db) return memList();
  try {
    const { data, error } = await db
      .from(TABLE)
      .select(COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapRow);
  } catch (err) {
    warn("listTests", err);
    return memList();
  }
}

export async function createTest(
  input: EligibilityTestInput,
): Promise<EligibilityTest> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { data, error } = await db
        .from(TABLE)
        .insert(toRow(input))
        .select(COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data as Row);
    } catch (err) {
      warn("createTest", err);
    }
  }
  const test: EligibilityTest = { ...input, id: crypto.randomUUID() };
  store().push(test);
  return test;
}

/** Bulk-create (one upload). Falls back to per-row memory inserts. */
export async function createTests(
  inputs: EligibilityTestInput[],
): Promise<EligibilityTest[]> {
  if (inputs.length === 0) return [];
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { data, error } = await db
        .from(TABLE)
        .insert(inputs.map(toRow))
        .select(COLUMNS);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Row[]).map(mapRow);
    } catch (err) {
      warn("createTests", err);
    }
  }
  const created = inputs.map((input) => ({
    ...input,
    id: crypto.randomUUID(),
  }));
  store().push(...created);
  return created;
}

export async function updateTest(
  id: string,
  input: EligibilityTestInput,
): Promise<EligibilityTest> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { data, error } = await db
        .from(TABLE)
        .update(toRow(input))
        .eq("id", id)
        .select(COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data as Row);
    } catch (err) {
      warn("updateTest", err);
    }
  }
  const list = store();
  const i = list.findIndex((t) => t.id === id);
  if (i === -1) throw new Error("Test not found");
  list[i] = { ...input, id };
  return list[i];
}

export async function deleteTest(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { error } = await db.from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      warn("deleteTest", err);
    }
  }
  memory = store().filter((t) => t.id !== id);
}

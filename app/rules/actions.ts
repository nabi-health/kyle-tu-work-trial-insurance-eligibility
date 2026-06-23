"use server";

import { revalidatePath } from "next/cache";
import {
  createRule,
  deleteRule,
  listRules,
  updateRule,
} from "@/lib/rules/repository";
import {
  detectWarnings,
  parseRulePayload,
  type RuleWarning,
} from "@/lib/rules/validation";
import type { RuleFields } from "@/lib/eligibility/types";

export type PreviewResult =
  | { ok: true; data: RuleFields; warnings: RuleWarning[] }
  | { ok: false; errors: Record<string, string>; formError?: string };

/** Validate + surface non-blocking warnings for the verify step. */
export async function previewRule(
  payload: unknown,
  selfId?: string,
): Promise<PreviewResult> {
  const parsed = parseRulePayload(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.errors, formError: parsed.formError };
  }
  const existing = await listRules();
  return {
    ok: true,
    data: parsed.data,
    warnings: detectWarnings(parsed.data, existing, selfId),
  };
}

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string>; formError?: string };

/** Validate then create or update a rule. */
export async function saveRule(
  payload: unknown,
  id?: string,
): Promise<SaveResult> {
  const parsed = parseRulePayload(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.errors, formError: parsed.formError };
  }
  const rule = id
    ? await updateRule(id, parsed.data)
    : await createRule(parsed.data);

  revalidatePath("/rules");
  revalidatePath("/coverage");
  if (id) revalidatePath(`/rules/${id}`);
  return { ok: true, id: rule.id };
}

export async function deleteRuleAction(id: string): Promise<void> {
  await deleteRule(id);
  revalidatePath("/rules");
  revalidatePath("/coverage");
}

"use server";

import { revalidatePath } from "next/cache";
import {
  createTest,
  createTests,
  deleteTest,
  updateTest,
} from "@/lib/tests/repository";
import {
  parseTestPayload,
  parseTestRows,
  type RowError,
} from "@/lib/tests/validation";

export type SaveTestResult =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string>; formError?: string };

/** Validate then create or update one test case. */
export async function saveTest(
  payload: unknown,
  id?: string,
): Promise<SaveTestResult> {
  const parsed = parseTestPayload(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.errors, formError: parsed.formError };
  }
  const test = id
    ? await updateTest(id, parsed.data)
    : await createTest(parsed.data);
  revalidatePath("/check/tests");
  return { ok: true, id: test.id };
}

export async function deleteTestAction(id: string): Promise<void> {
  await deleteTest(id);
  revalidatePath("/check/tests");
}

export type UploadTestsResult =
  | { ok: true; created: number }
  | { ok: false; errors: RowError[] };

/**
 * Validate a batch of raw rows (from CSV or JSON upload) and create the ones
 * that pass. Re-validates on the server (a server action is a public endpoint)
 * and rejects the whole batch if any row is invalid, so the upload is atomic.
 */
export async function uploadTests(rows: unknown[]): Promise<UploadTestsResult> {
  const parsed = parseTestRows(rows);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  const created = await createTests(parsed.tests);
  revalidatePath("/check/tests");
  return { ok: true, created: created.length };
}

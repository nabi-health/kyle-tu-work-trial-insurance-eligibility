/**
 * Shared file → validated member-queries pipeline. Extracted from the bulk
 * sandbox so the assistant's chat composer can reuse the exact same ingest
 * (extension + size checks, CSV vs JSON branch, row validation).
 */
import type { EligibilityQuery } from "../eligibility/types";
import { parseCsv } from "./csv";
import { type RowError, parseQueryRows } from "./validation";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export type QueryParseResult =
  | { ok: true; queries: EligibilityQuery[] }
  /** A whole-file problem (banner); rowErrors are per-row validation failures. */
  | { ok: false; fileError?: string; rowErrors?: RowError[] };

/** Split a `parseQueryRows` failure into file-level vs per-row, for the UI. */
function fromRows(rawRows: unknown[]): QueryParseResult {
  const validated = parseQueryRows(rawRows);
  if (validated.success) return { ok: true, queries: validated.queries };
  const fileLevel = validated.errors.find((er) => er.row === 0);
  if (fileLevel) return { ok: false, fileError: fileLevel.message };
  return { ok: false, rowErrors: validated.errors };
}

/** Parse member-query text (CSV or JSON) into validated queries. */
export function parseQueryText(text: string, isJson: boolean): QueryParseResult {
  if (isJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, fileError: "Invalid JSON syntax." };
    }
    if (!Array.isArray(parsed)) {
      return { ok: false, fileError: "JSON must be an array of query objects." };
    }
    return fromRows(parsed);
  }
  const res = parseCsv(text);
  if (!res.success) return { ok: false, fileError: res.error };
  return fromRows(res.rows);
}

/** Read + validate an uploaded .csv/.json file of member queries. */
export async function readQueryFile(file: File): Promise<QueryParseResult> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");
  const isJson = name.endsWith(".json");
  if (!isCsv && !isJson) {
    return { ok: false, fileError: "Upload a .csv or .json file." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, fileError: "File is too large (max 2 MB)." };
  }
  return parseQueryText(await file.text(), isJson);
}

/**
 * Turn an uploaded file or pasted CSV/JSON into a validated `ChatAttachment`.
 * The kind is inferred from the CSV headers — outcome columns present means the
 * rows are whole rules (a bulk-update import); otherwise they're member queries
 * (a bulk eligibility check). The caller can override the inferred kind.
 */
import { QUERY_COLUMNS, tokenizeCsv } from "../check/csv";
import {
  MAX_UPLOAD_BYTES,
  parseQueryText,
} from "../check/upload";
import type { RowError } from "../check/validation";
import {
  OUTCOME_COLUMNS,
  RULE_COLUMNS,
  parseRuleCsv,
} from "../rules/csv";
import type { ChatAttachment } from "./types";

export type AttachmentKind = ChatAttachment["kind"];

export type AttachmentParseResult =
  | { ok: true; attachment: ChatAttachment }
  | { ok: false; fileError?: string; rowErrors?: RowError[] };

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Normalized headers from the first CSV record (null if untokenizable/empty). */
function csvHeaders(text: string): string[] | null {
  const records = tokenizeCsv(text.replace(/^﻿/, ""));
  if (!records || records.length === 0) return null;
  return records[0].map(normalizeHeader);
}

/** Any outcome column in the header marks this as a rule import, not a query. */
function looksLikeRuleCsv(headers: string[]): boolean {
  return OUTCOME_COLUMNS.some((c) => headers.includes(c));
}

function toMemberAttachment(text: string, isJson: boolean): AttachmentParseResult {
  const res = parseQueryText(text, isJson);
  if (!res.ok) return res;
  return {
    ok: true,
    attachment: {
      kind: "member_queries",
      count: res.queries.length,
      columns: [...QUERY_COLUMNS],
      queries: res.queries,
    },
  };
}

function toRuleAttachment(text: string, headers: string[]): AttachmentParseResult {
  const res = parseRuleCsv(text);
  if (!res.success) {
    const fileLevel = res.errors.find((er) => er.row === 0);
    if (fileLevel) return { ok: false, fileError: fileLevel.message };
    return { ok: false, rowErrors: res.errors };
  }
  return {
    ok: true,
    attachment: {
      kind: "rule_rows",
      count: res.rows.length,
      columns: headers.filter((h) => (RULE_COLUMNS as readonly string[]).includes(h)),
      rows: res.rows,
    },
  };
}

/** Parse text into an attachment; `force` overrides the header-based inference. */
export function parseAttachmentText(
  text: string,
  opts: { isJson: boolean; force?: AttachmentKind },
): AttachmentParseResult {
  // JSON attachments are always member queries (rule import is CSV-only).
  if (opts.isJson || opts.force === "member_queries") {
    return toMemberAttachment(text, opts.isJson);
  }
  const headers = csvHeaders(text);
  if (headers === null) return { ok: false, fileError: "The file is empty." };
  const kind: AttachmentKind =
    opts.force ?? (looksLikeRuleCsv(headers) ? "rule_rows" : "member_queries");
  return kind === "rule_rows"
    ? toRuleAttachment(text, headers)
    : toMemberAttachment(text, false);
}

/** Read + validate an uploaded .csv/.json file into a ChatAttachment. */
export async function readChatAttachmentFile(
  file: File,
  force?: AttachmentKind,
): Promise<AttachmentParseResult> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");
  const isJson = name.endsWith(".json");
  if (!isCsv && !isJson) {
    return { ok: false, fileError: "Attach a .csv or .json file." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, fileError: "File is too large (max 2 MB)." };
  }
  return parseAttachmentText(await file.text(), { isJson, force });
}

/** Does pasted text look like a CSV/JSON dataset worth lifting into a chip? */
export function looksLikeDataset(text: string): boolean {
  const t = text.trim();
  if (t.length < 20) return false;
  if (t.startsWith("[")) return true; // JSON array of queries
  const headers = csvHeaders(t);
  if (!headers) return false;
  // A header row that declares the four member-query columns (rule CSVs are a
  // superset of these), and at least one data line.
  const hasQueryCols = (QUERY_COLUMNS as readonly string[]).every((c) =>
    headers.includes(c),
  );
  return hasQueryCols && t.includes("\n");
}

/** Parse pasted clipboard text (CSV or JSON array) into a ChatAttachment. */
export function readChatAttachmentText(
  text: string,
  force?: AttachmentKind,
): AttachmentParseResult {
  const isJson = text.trim().startsWith("[");
  return parseAttachmentText(text, { isJson, force });
}

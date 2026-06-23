/**
 * Minimal RFC-4180 CSV parser/serializer for the bulk sandbox. Hand-rolled (no
 * dependency) and structural only — it knows nothing about query semantics or
 * enums; business validation lives in ./validation. The parser exists because
 * a free-text payer_group can legitimately contain commas (e.g. "Blue Cross,
 * Inc."), so a naive split(",") would corrupt input.
 */

/** The four query columns, in canonical order. Headers normalize to these. */
export const QUERY_COLUMNS = [
  "payer_group",
  "plan_type",
  "plan_structure",
  "service_state",
] as const;

export type CsvParseResult =
  | { success: true; rows: Record<string, string>[] }
  | { success: false; error: string };

const REQUIRED = new Set<string>(QUERY_COLUMNS);

/** trim → lowercase → spaces to underscores, so "Plan Type" maps to plan_type. */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Tokenize CSV text into records of raw string cells. Handles quoted fields,
 * "" escapes, embedded commas/newlines inside quotes, and LF or CRLF line
 * endings. Returns null on an unterminated quote. Structural only — knows
 * nothing about which columns are expected (see `parseCsv` / `parseRuleCsv`).
 */
export function tokenizeCsv(text: string): string[][] | null {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let fieldStarted = false; // distinguishes a real empty record from "between records"

  const endField = () => {
    record.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      fieldStarted = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\n" || c === "\r") {
      // Treat CRLF as one terminator; collapse a following \n after \r.
      if (c === "\r" && text[i + 1] === "\n") i++;
      // A blank physical line (no field content, single empty cell) is skipped.
      if (record.length === 0 && field === "" && !fieldStarted) continue;
      endRecord();
    } else {
      field += c;
      fieldStarted = true;
    }
  }

  if (inQuotes) return null; // unterminated quote

  // Flush a trailing field/record if the file didn't end with a newline.
  if (fieldStarted || field !== "" || record.length > 0) endRecord();

  return records;
}

/** Parse CSV text into header-keyed rows, mapping headers to the known query columns. */
export function parseCsv(text: string): CsvParseResult {
  // Strip a UTF-8 BOM (Excel adds one) before anything else.
  const clean = text.replace(/^﻿/, "");
  if (clean.trim() === "") {
    return { success: false, error: "The file is empty." };
  }

  const records = tokenizeCsv(clean);
  if (records === null) {
    return { success: false, error: "Malformed CSV: an unterminated quoted field." };
  }
  if (records.length === 0) {
    return { success: false, error: "The file is empty." };
  }

  const headers = records[0].map(normalizeHeader);

  const seen = new Set<string>();
  for (const h of headers) {
    if (h === "") continue;
    if (seen.has(h)) {
      return { success: false, error: `Duplicate column "${h}" in the header row.` };
    }
    seen.add(h);
  }

  const missing = [...REQUIRED].filter((c) => !seen.has(c));
  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
    };
  }

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const cells = records[r];
    const row: Record<string, string> = {};
    // Only carry the known columns; extra (e.g. trailing Excel) columns are dropped.
    headers.forEach((h, c) => {
      if (REQUIRED.has(h)) row[h] = (cells[c] ?? "").trim();
    });
    rows.push(row);
  }

  return { success: true, rows };
}

/** Does a field need quoting per RFC-4180? */
function needsQuote(value: string): boolean {
  return /[",\r\n]/.test(value);
}

function encodeField(value: string): string {
  return needsQuote(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serialize rows to CSV with the given column order. Quotes only fields that
 * need it; escapes inner quotes; uses CRLF record separators. Inverse of
 * parseCsv (round-trips).
 */
export function toCsv(
  rows: Record<string, string>[],
  columns: readonly string[],
): string {
  const lines = [columns.map(encodeField).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => encodeField(row[c] ?? "")).join(","));
  }
  return lines.join("\r\n");
}

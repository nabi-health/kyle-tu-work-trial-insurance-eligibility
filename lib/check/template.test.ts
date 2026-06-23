import { describe, expect, it } from "vitest";
import { QUERY_COLUMNS, parseCsv } from "./csv";
import { csvTemplate, jsonTemplate } from "./template";
import { parseQueryRows } from "./validation";

describe("templates", () => {
  it("CSV template has exactly the query columns and is valid input", () => {
    const csv = csvTemplate();
    expect(csv.split("\r\n")[0]).toBe(QUERY_COLUMNS.join(","));
    const parsed = parseCsv(csv);
    expect(parsed.success).toBe(true);
    const validated = parseQueryRows(parsed.success ? parsed.rows : []);
    expect(validated.success).toBe(true);
  });

  it("JSON template parses to an array of valid query rows", () => {
    const rows = JSON.parse(jsonTemplate());
    expect(Array.isArray(rows)).toBe(true);
    expect(parseQueryRows(rows).success).toBe(true);
  });
});

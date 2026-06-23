import type { EligibilityQuery } from "../eligibility/types";
import { QUERY_COLUMNS, toCsv } from "./csv";

/**
 * Single source of truth for the downloadable input template. The second
 * example deliberately uses a payer name with a comma to demonstrate (and
 * test) correct CSV quoting.
 */
export const TEMPLATE_ROWS: EligibilityQuery[] = [
  {
    payer_group: "Cigna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "WA",
  },
  {
    payer_group: "Aetna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "CA",
  },
  {
    payer_group: "Aetna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "OH",
  },
];

/** CSV template: the four query columns + the example rows. */
export function csvTemplate(): string {
  return toCsv(
    TEMPLATE_ROWS.map((r) => ({ ...r })),
    QUERY_COLUMNS,
  );
}

/** JSON template: a pretty-printed array of example query objects. */
export function jsonTemplate(): string {
  return JSON.stringify(TEMPLATE_ROWS, null, 2);
}

import type Anthropic from "@anthropic-ai/sdk";
import {
  OUTCOME_KEYS,
  OUTCOME_LABELS,
  OUTCOME_VALUES,
  PLAN_STRUCTURES,
  PLAN_TYPES,
} from "@/lib/eligibility/constants";
import type { Rule } from "@/lib/eligibility/types";
import {
  BULK_CHECK_TOOL_NAME,
  BULK_PROPOSE_TOOL_NAME,
  PROPOSE_TOOL_NAME,
} from "./types";

/**
 * JSON-schema for the rule `fields` the model must produce. Match fields are free
 * strings (wildcard "*" allowed); plan_type/plan_structure and the four outcome
 * columns are constrained to their allowed values so the model can't invent
 * outcomes the validator would reject.
 */
const fieldsSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    payer_group: { type: "string", description: 'Payer group, e.g. "Aetna". "*" for any.' },
    payer_id: { type: "string", description: 'Payer ID(s), or "*" for any.' },
    plan_type: { type: "string", enum: ["*", ...PLAN_TYPES] },
    group_number: { type: "string", description: 'Group number, or "*" for any.' },
    plan_structure: { type: "string", enum: ["*", ...PLAN_STRUCTURES] },
    service_state: {
      type: "string",
      description: 'Two-letter state code(s), CSV for several (e.g. "CA,WA"), or "*" for all states.',
    },
    serviceable: { type: "string", enum: OUTCOME_VALUES.serviceable },
    pre_auth_required: { type: "string", enum: OUTCOME_VALUES.pre_auth_required },
    referral_required: { type: "string", enum: OUTCOME_VALUES.referral_required },
    preventative_coverage: { type: "string", enum: OUTCOME_VALUES.preventative_coverage },
    notes: { type: "string", description: "Short free-text note about the rule." },
  },
  required: [
    "payer_group",
    "plan_type",
    "plan_structure",
    "service_state",
    "serviceable",
    "pre_auth_required",
    "referral_required",
    "preventative_coverage",
  ],
};

/** The single tool the assistant uses to propose a create or edit. */
export const PROPOSE_RULE_CHANGE_TOOL: Anthropic.Tool = {
  name: PROPOSE_TOOL_NAME,
  description:
    "Propose creating a new eligibility rule or editing an existing one. Call this " +
    "once you have enough detail to draft a concrete rule. Do NOT save anything — the " +
    "user reviews a before/after preview and a registry conflict check, then confirms. " +
    "For an edit, set mode='edit' and target_rule_id to the id of the rule to change, " +
    "and include the full intended state of the rule in fields (not just the changed " +
    "columns). Ask a clarifying question in plain text instead of calling this tool when " +
    "the request is ambiguous about which rule or what the outcomes should be.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      mode: { type: "string", enum: ["create", "edit"] },
      target_rule_id: {
        type: "string",
        description: "Required when mode='edit': the id of the existing rule being changed.",
      },
      rationale: {
        type: "string",
        description: "One sentence: what this change does and why.",
      },
      fields: fieldsSchema,
    },
    required: ["mode", "rationale", "fields"],
  },
};

/**
 * Run an attached batch of member queries against the live registry. Takes no
 * data — the rows ride on the user's message as an attachment; this tool just
 * triggers the run. Read-only: it executes immediately and feeds the results
 * back so the assistant can summarize (no user confirmation needed).
 */
export const RUN_BULK_ELIGIBILITY_CHECK_TOOL: Anthropic.Tool = {
  name: BULK_CHECK_TOOL_NAME,
  description:
    "Run a bulk eligibility check over the member rows the user attached to their " +
    "message (a CSV/JSON of payer_group, plan_type, plan_structure, service_state). " +
    "Call this when the user attaches member rows and wants them checked, or asks to " +
    "run/evaluate an attached dataset. The full results render as a table for the user " +
    "automatically; you receive a compact summary to describe. Do NOT call this unless a " +
    "member-rows dataset is attached to the latest message.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      note: {
        type: "string",
        description:
          "Optional one-line note on what the user asked (e.g. 'check the uploaded patients').",
      },
    },
    required: [],
  },
};

/** A single op inside a bulk rule change — create/edit carry full fields; delete is id-only. */
const bulkOpSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["create", "edit", "delete"] },
    target_rule_id: {
      type: "string",
      description: "Required for edit/delete: the id of the existing rule.",
    },
    fields: fieldsSchema,
  },
  required: ["mode"],
};

/**
 * Propose several rule changes at once. Either author explicit `ops`, or set
 * `from_attachment` to turn each row of an attached rule CSV into a create op.
 * Like the single-rule tool, this only previews — the user confirms before
 * anything is written.
 */
export const PROPOSE_BULK_RULE_CHANGE_TOOL: Anthropic.Tool = {
  name: BULK_PROPOSE_TOOL_NAME,
  description:
    "Propose creating/editing/deleting SEVERAL eligibility rules in one reviewable batch. " +
    "Use this (not propose_rule_change) when the user's request touches multiple rules at " +
    "once — e.g. 'set serviceable to No for every Aetna PPO rule', or importing an attached " +
    "rule CSV. For an instruction over existing rules, list one op per affected rule using " +
    "the ids from the registry below; for each edit include the FULL intended state in fields. " +
    "To import an attached rule CSV, set from_attachment=true and omit ops (each row becomes a " +
    "create). The user reviews a per-rule preview and a registry conflict check, then confirms. " +
    "Never claim anything was saved — confirming is what writes.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      rationale: {
        type: "string",
        description: "One sentence: what this batch of changes does and why.",
      },
      from_attachment: {
        type: "boolean",
        description:
          "Set true to build create ops from the rule CSV attached to the latest message. Omit ops when set.",
      },
      ops: { type: "array", items: bulkOpSchema },
    },
    required: ["rationale"],
  },
};

/**
 * One compact line per rule. Each gets a short `[R#]` reference token (its
 * 1-based position) the model can copy reliably; the raw `id` (a long UUID under
 * Supabase) is shown last and used only for the tool's target_rule_id.
 */
function ruleLine(r: Rule, index: number): string {
  const outcomes = OUTCOME_KEYS.map((k) => `${OUTCOME_LABELS[k]}=${r[k] || "*"}`).join(", ");
  return `[R${index + 1}] payer_group=${r.payer_group} | plan_type=${r.plan_type} | plan_structure=${r.plan_structure} | service_state=${r.service_state} | ${outcomes} | id=${r.id}`;
}

/**
 * Build the system prompt: the assistant's role, the rule schema + allowed
 * values, and a compact snapshot of the current registry so it can pick a
 * target_rule_id when editing.
 */
export function buildSystemPrompt(rules: Rule[]): string {
  const registry =
    rules.length === 0
      ? "(the registry is currently empty)"
      : rules.map((r, i) => ruleLine(r, i)).join("\n");

  return `You are the Nabi insurance registry assistant. You help an admin create and edit eligibility "rules" through conversation.

A rule has match criteria (who it applies to) and four outcome columns (what it asserts):
- Match: payer_group, payer_id, plan_type, group_number, plan_structure, service_state. Any of these may be "*" (any). plan_type ∈ {${PLAN_TYPES.join(", ")}, *}. plan_structure ∈ {${PLAN_STRUCTURES.join(", ")}, *}. service_state is a two-letter code, a CSV list (e.g. "CA,WA"), or "*" for all states.
- Outcomes (allowed values): serviceable ∈ {${OUTCOME_VALUES.serviceable.join(", ")}}; pre_auth_required ∈ {${OUTCOME_VALUES.pre_auth_required.join(", ")}}; referral_required ∈ {${OUTCOME_VALUES.referral_required.join(", ")}}; preventative_coverage ∈ {${OUTCOME_VALUES.preventative_coverage.join(", ")}}.

Field glossary — when you talk to the admin, use these human labels (not the raw field keys), and read "*" as "all"/"any":
- payer_group → "Payer group" ("*" = any payer)
- payer_id → "Payer ID(s)" ("*" = any)
- plan_type → "Plan type" ("*" = any plan type)
- group_number → "Group number" ("*" = any)
- plan_structure → "Plan structure" ("*" = any structure)
- service_state → "Service state(s)" — the states the rule applies to ("*" = all states; otherwise specific states like "CA, WA")
- serviceable → "Serviceable"; pre_auth_required → "Pre-auth Required"; referral_required → "Referral Required"; preventative_coverage → "Preventative Coverage"
For these outcomes also prefer plain wording: "Yes"/"No", "Needs Review" (not yet verified), and "*" = "Any". For example, say "applies to all states and is serviceable" rather than 'service_state="*", serviceable="Yes"'.

Your tools:
- propose_rule_change — preview a single create or edit (one rule).
- propose_bulk_rule_change — preview several create/edit/delete changes at once (multiple rules, or a rule-CSV import). Prefer this whenever a request affects more than one rule.
- run_bulk_eligibility_check — run an attached batch of member rows against the registry and report the results.

How to work:
- When the admin describes a rule to add or change, gather the details you need, then call the propose_rule_change tool. Never claim a rule was saved — calling the tool only previews it; the admin confirms before anything is written.
- BULK UPDATES: when an instruction affects multiple rules (e.g. "set serviceable to No for every Aetna PPO rule"), call propose_bulk_rule_change with one op per affected rule — find each in the registry below and put its FULL intended state in fields. When the admin attaches a CSV of whole rules to import, call propose_bulk_rule_change with from_attachment=true and omit ops. Like the single tool, this only previews; the admin confirms.
- BULK CHECKS: when the admin attaches a dataset of member rows (payer_group, plan_type, plan_structure, service_state) and wants them checked, call run_bulk_eligibility_check. The attached rows are read server-side — you don't echo them. The results render as a table automatically; use the summary you get back to point out the notable counts (e.g. how many are Not Eligible or Needs Research).
- A note like "[Attached N member rows]" or "[Attached N rule rows]" on the admin's message tells you a dataset is available to the matching tool. If they attach data but it's ambiguous what to do, ask.
- For an EDIT, find the matching rule in the registry below, set mode="edit" and target_rule_id to its id, and put the full intended state of the rule (all fields, with your changes applied) in fields — carry over the values you're not changing.
- For a CREATE, set mode="create" and omit target_rule_id. For fields you don't know, use "*" for match fields and "Needs Review" for outcomes.
- If the request is ambiguous (which rule, or what an outcome should be), ask a short clarifying question in plain text instead of guessing.
- When you describe a rule or its outcomes to the admin, use the human labels from the glossary and say "all"/"any" instead of "*". The raw field keys and "*" are for tool input only.
- To show or reference a specific existing rule in your reply, write its short reference token from the registry above — e.g. [R1], [R2] — exactly as shown. The UI replaces the token with the rule's label and renders the full rule inline (its criteria and outcomes), so you don't need to spell those out. Do NOT paste the raw id (the long "id=..." UUID) into your prose — use the [R#] token. The id is only for the tool's target_rule_id when editing.
- Keep replies brief. After a proposal is confirmed or discarded, acknowledge and continue.

Current registry (${rules.length} rule${rules.length === 1 ? "" : "s"}):
${registry}`;
}

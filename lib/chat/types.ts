import type {
  EligibilityQuery,
  EligibilityResult,
  RuleFields,
} from "@/lib/eligibility/types";

/** Whether a proposal creates a brand-new rule or edits an existing one. */
export type ProposalMode = "create" | "edit";

/**
 * A concrete rule change the assistant proposes, produced by the model's
 * `propose_rule_change` tool call. The user verifies it (before/after + registry
 * check) and confirms before anything is written.
 */
export interface RuleProposal {
  mode: ProposalMode;
  /** Present for edits — the id of the rule being changed. */
  target_rule_id?: string;
  /** The full "after" state of the rule. */
  fields: RuleFields;
  /** One-line explanation of what the change does and why. */
  rationale: string;
  /** Anthropic tool_use id — must be echoed verbatim on the next turn. */
  toolUseId: string;
}

export type ChatRole = "user" | "assistant";

/** What the user did with a proposal once it was rendered. */
export type ProposalResolution = "confirmed" | "discarded";

/**
 * A dataset the user attached to a turn (uploaded file or pasted CSV), parsed
 * and validated client-side. The bulk data rides on the message rather than the
 * tool input — the model only sees a short note and triggers the matching tool,
 * which reads the parsed rows back from the request body server-side.
 */
export type ChatAttachment =
  | {
      kind: "member_queries";
      count: number;
      columns: string[];
      queries: EligibilityQuery[];
    }
  | {
      kind: "rule_rows";
      count: number;
      columns: string[];
      rows: RuleFields[];
    };

/** One operation in a bulk rule change. `fields` is absent for a delete. */
export interface BulkRuleOp {
  mode: ProposalMode | "delete";
  /** Present for edit/delete — the id of the rule being changed or removed. */
  target_rule_id?: string;
  /** The full "after" state of the rule (absent for delete). */
  fields?: RuleFields;
}

/**
 * A batch of rule changes the assistant proposes in one card (from a
 * conversational instruction or a CSV import). The user reviews every op +
 * a registry conflict check, then confirms once to apply them all.
 */
export interface BulkRuleProposal {
  ops: BulkRuleOp[];
  rationale: string;
  /** Anthropic tool_use id — echoed verbatim on the next turn. */
  toolUseId: string;
}

/** Results of a bulk eligibility check, rendered inline as a table. */
export interface BulkCheckPayload {
  /** Anthropic tool_use id — echoed verbatim on the next turn. */
  toolUseId: string;
  results: EligibilityResult[];
}

/**
 * One message in the conversation. An assistant message may carry a `proposal`
 * (when the model called the tool) and, once acted on, a `resolution`.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  proposal?: RuleProposal;
  /** A bulk rule change (create/edit/delete several rules), pending confirm. */
  bulkProposal?: BulkRuleProposal;
  /** Results of a bulk eligibility check the assistant ran (read-only). */
  bulkCheck?: BulkCheckPayload;
  /** A dataset the user attached to this (user) turn. */
  attachment?: ChatAttachment;
  resolution?: ProposalResolution;
  /** For a confirmed create/edit, the saved rule's id (for the success note). */
  savedRuleId?: string;
  /** Set when this assistant turn is an error notice (rendered in danger tone). */
  error?: boolean;
}

/** Wire format the client POSTs to /api/chat each turn. */
export interface ChatTurnRequest {
  messages: ChatMessage[];
}

/** A persisted conversation (stored in Supabase, scoped by user name). */
export interface SavedChat {
  id: string;
  title: string;
  /** Epoch milliseconds. */
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

/** Streaming events the route handler emits as newline-delimited JSON. */
export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "proposal"; proposal: RuleProposal }
  | { type: "bulk_proposal"; proposal: BulkRuleProposal }
  | { type: "bulk_check"; payload: BulkCheckPayload }
  | { type: "done" }
  | { type: "error"; message: string };

/** The tool the model uses to propose a single create/edit. */
export const PROPOSE_TOOL_NAME = "propose_rule_change";

/** The tool the model uses to propose several rule changes at once. */
export const BULK_PROPOSE_TOOL_NAME = "propose_bulk_rule_change";

/** The tool the model uses to run an attached batch of member queries. */
export const BULK_CHECK_TOOL_NAME = "run_bulk_eligibility_check";

/** Model powering the assistant chat. */
export const CHAT_MODEL = "claude-sonnet-4-6";

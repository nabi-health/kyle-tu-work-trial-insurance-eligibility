import type Anthropic from "@anthropic-ai/sdk";
import {
  BULK_CHECK_TOOL_NAME,
  BULK_PROPOSE_TOOL_NAME,
  PROPOSE_TOOL_NAME,
  type ChatAttachment,
  type ChatMessage,
} from "./types";
import { summarizeBulkResolution, summarizeResultsForModel } from "./summary";

/** A short note so the model knows a dataset is attached (the rows ride server-side). */
export function attachmentNote(att: ChatAttachment): string {
  const kind = att.kind === "rule_rows" ? "rule rows" : "member rows";
  return `[Attached ${att.count} ${kind}: ${att.columns.join(", ")}]`;
}

/**
 * Convert the client's conversation into Anthropic `MessageParam[]`.
 *
 * The one invariant the API enforces: every `tool_use` block must be answered by
 * a matching `tool_result` in the next message. So a resolved proposal becomes an
 * assistant message carrying the `tool_use` block, immediately followed by a
 * synthetic user message carrying the `tool_result` (what the user decided).
 *
 * Three tool shapes are reconstructed: a single rule proposal, a bulk rule
 * proposal (both human-in-the-loop — skipped while unresolved, since a dangling
 * tool_use with no tool_result would 400), and a bulk eligibility check (which
 * already ran — its tool_result is the compact summary the model saw).
 */
export function toAnthropicMessages(
  messages: ChatMessage[],
): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];

  for (const m of messages) {
    if (m.role === "user") {
      const parts = [m.text.trim()];
      if (m.attachment) parts.push(attachmentNote(m.attachment));
      const text = parts.filter(Boolean).join("\n");
      if (text) out.push({ role: "user", content: text });
      continue;
    }

    // assistant — single rule proposal (human-in-the-loop).
    if (m.proposal) {
      if (!m.resolution) continue; // dangling tool_use — drop until resolved.

      const content: Anthropic.ContentBlockParam[] = [];
      if (m.text.trim()) content.push({ type: "text", text: m.text });
      content.push({
        type: "tool_use",
        id: m.proposal.toolUseId,
        name: PROPOSE_TOOL_NAME,
        input: {
          mode: m.proposal.mode,
          ...(m.proposal.target_rule_id
            ? { target_rule_id: m.proposal.target_rule_id }
            : {}),
          rationale: m.proposal.rationale,
          fields: m.proposal.fields,
        },
      });
      out.push({ role: "assistant", content });

      const resultText =
        m.resolution === "confirmed"
          ? `The user accepted this proposal. It was saved as rule ${
              m.savedRuleId ?? "(unknown id)"
            }.`
          : "The user discarded this proposal. Revise it based on their next message, or ask what to change.";
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.proposal.toolUseId,
            content: resultText,
          },
        ],
      });
      continue;
    }

    // assistant — bulk rule proposal (human-in-the-loop).
    if (m.bulkProposal) {
      if (!m.resolution) continue; // dangling tool_use — drop until resolved.

      const content: Anthropic.ContentBlockParam[] = [];
      if (m.text.trim()) content.push({ type: "text", text: m.text });
      content.push({
        type: "tool_use",
        id: m.bulkProposal.toolUseId,
        name: BULK_PROPOSE_TOOL_NAME,
        input: {
          rationale: m.bulkProposal.rationale,
          ops: m.bulkProposal.ops,
        },
      });
      out.push({ role: "assistant", content });
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.bulkProposal.toolUseId,
            content: summarizeBulkResolution(
              m.resolution,
              m.bulkProposal.ops.length,
            ),
          },
        ],
      });
      continue;
    }

    // assistant — bulk eligibility check (already executed server-side).
    if (m.bulkCheck) {
      out.push({
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: m.bulkCheck.toolUseId,
            name: BULK_CHECK_TOOL_NAME,
            input: {},
          },
        ],
      });
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.bulkCheck.toolUseId,
            content: summarizeResultsForModel(m.bulkCheck.results),
          },
        ],
      });
      // The prose recap the model wrote after seeing the results.
      if (m.text.trim()) {
        out.push({ role: "assistant", content: m.text });
      }
      continue;
    }

    // Plain assistant text turn.
    if (m.text.trim()) out.push({ role: "assistant", content: m.text });
  }

  return out;
}

import Anthropic from "@anthropic-ai/sdk";
import { EMPTY } from "@/components/rules/rule-helpers";
import { evaluate } from "@/lib/eligibility/engine";
import { listRules } from "@/lib/rules/repository";
import { MAX_ROWS } from "@/lib/check/validation";
import {
  buildSystemPrompt,
  PROPOSE_BULK_RULE_CHANGE_TOOL,
  PROPOSE_RULE_CHANGE_TOOL,
  RUN_BULK_ELIGIBILITY_CHECK_TOOL,
} from "@/lib/chat/proposal-tool";
import { toAnthropicMessages } from "@/lib/chat/history";
import { summarizeResultsForModel } from "@/lib/chat/summary";
import {
  BULK_CHECK_TOOL_NAME,
  BULK_PROPOSE_TOOL_NAME,
  CHAT_MODEL,
  PROPOSE_TOOL_NAME,
  type BulkCheckPayload,
  type BulkRuleOp,
  type BulkRuleProposal,
  type ChatStreamEvent,
  type ChatTurnRequest,
  type ProposalMode,
  type RuleProposal,
} from "@/lib/chat/types";
import type { EligibilityQuery, RuleFields } from "@/lib/eligibility/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Hard ceiling on agentic round-trips per turn — a backstop against loops. */
const MAX_STEPS = 4;

/** Single-line NDJSON error stream, so the client renders it like any other reply. */
function errorStream(message: string): Response {
  const event: ChatStreamEvent = { type: "error", message };
  return new Response(JSON.stringify(event) + "\n", {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

/** Coerce a raw `fields` object into a full RuleFields over the blank base. */
function toFields(raw: unknown): RuleFields {
  return {
    ...EMPTY,
    ...(raw && typeof raw === "object" ? (raw as Partial<RuleFields>) : {}),
  };
}

/** Build a normalized RuleProposal from a raw `propose_rule_change` tool input. */
function toProposal(toolUseId: string, raw: unknown): RuleProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const mode = input.mode === "edit" ? "edit" : "create";
  return {
    mode: mode as ProposalMode,
    target_rule_id:
      typeof input.target_rule_id === "string" && input.target_rule_id
        ? input.target_rule_id
        : undefined,
    fields: toFields(input.fields),
    rationale: typeof input.rationale === "string" ? input.rationale : "",
    toolUseId,
  };
}

/**
 * Build a BulkRuleProposal from a raw `propose_bulk_rule_change` input. With
 * `from_attachment`, each attached rule row becomes a create op; otherwise the
 * model's explicit ops are normalized.
 */
function toBulkProposal(
  toolUseId: string,
  raw: unknown,
  ruleRows: RuleFields[],
): BulkRuleProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const rationale = typeof input.rationale === "string" ? input.rationale : "";

  let ops: BulkRuleOp[];
  if (input.from_attachment) {
    ops = ruleRows.map((fields) => ({ mode: "create", fields }));
  } else {
    const rawOps = Array.isArray(input.ops) ? input.ops : [];
    ops = rawOps.map((o): BulkRuleOp => {
      const op = (o ?? {}) as Record<string, unknown>;
      const mode =
        op.mode === "edit" || op.mode === "delete" ? op.mode : "create";
      const target_rule_id =
        typeof op.target_rule_id === "string" && op.target_rule_id
          ? op.target_rule_id
          : undefined;
      return mode === "delete"
        ? { mode, target_rule_id }
        : { mode, target_rule_id, fields: toFields(op.fields) };
    });
  }

  if (ops.length === 0) return null;
  return { ops, rationale, toolUseId };
}

/** The most recent attachment of a given kind, scanning user messages newest-first. */
function latestAttachment(
  body: ChatTurnRequest,
  kind: "member_queries" | "rule_rows",
) {
  for (let i = body.messages.length - 1; i >= 0; i--) {
    const att = body.messages[i].attachment;
    if (att?.kind === kind) return att;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  let body: ChatTurnRequest;
  try {
    body = (await request.json()) as ChatTurnRequest;
  } catch {
    return errorStream("Couldn't read the request.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorStream(
      "The assistant isn't configured yet — set ANTHROPIC_API_KEY on the server.",
    );
  }

  const messages = toAnthropicMessages(body.messages ?? []);
  if (messages.length === 0) {
    return errorStream("There's nothing to send yet.");
  }

  const memberAtt = latestAttachment(body, "member_queries");
  const ruleAtt = latestAttachment(body, "rule_rows");
  const memberQueries: EligibilityQuery[] =
    memberAtt?.kind === "member_queries" ? memberAtt.queries : [];
  const ruleRows: RuleFields[] =
    ruleAtt?.kind === "rule_rows" ? ruleAtt.rows : [];

  const rules = await listRules();
  const system = buildSystemPrompt(rules);
  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        for (let step = 1; ; step++) {
          const llm = client.messages.stream({
            model: CHAT_MODEL,
            max_tokens: 4096,
            system,
            tools: [
              PROPOSE_RULE_CHANGE_TOOL,
              PROPOSE_BULK_RULE_CHANGE_TOOL,
              RUN_BULK_ELIGIBILITY_CHECK_TOOL,
            ],
            messages,
          });

          llm.on("text", (delta) => send({ type: "text", delta }));

          const final = await llm.finalMessage();
          const toolUses = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );
          if (toolUses.length === 0) break;

          // Auto-execute (read): run the attached batch, feed results back, loop.
          const checkUse = toolUses.find((b) => b.name === BULK_CHECK_TOOL_NAME);
          if (checkUse && step < MAX_STEPS) {
            const limited = memberQueries.slice(0, MAX_ROWS);
            const payload: BulkCheckPayload = {
              toolUseId: checkUse.id,
              results: limited.map((q) => evaluate(q, rules)),
            };
            send({ type: "bulk_check", payload });

            messages.push({
              role: "assistant",
              content: final.content as Anthropic.ContentBlockParam[],
            });
            messages.push({
              role: "user",
              content: toolUses.map((b) => ({
                type: "tool_result" as const,
                tool_use_id: b.id,
                content:
                  b.id === checkUse.id
                    ? summarizeResultsForModel(payload.results)
                    : "Only one action runs per turn — this was not executed.",
              })),
            });
            continue; // let the model write its prose summary.
          }

          // Stop actions (write proposals): emit one and end the turn.
          const bulkUse = toolUses.find((b) => b.name === BULK_PROPOSE_TOOL_NAME);
          const singleUse = toolUses.find((b) => b.name === PROPOSE_TOOL_NAME);
          if (bulkUse) {
            const proposal = toBulkProposal(bulkUse.id, bulkUse.input, ruleRows);
            if (proposal) send({ type: "bulk_proposal", proposal });
          } else if (singleUse) {
            const proposal = toProposal(singleUse.id, singleUse.input);
            if (proposal) send({ type: "proposal", proposal });
          }
          break;
        }
        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "The assistant failed to respond.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

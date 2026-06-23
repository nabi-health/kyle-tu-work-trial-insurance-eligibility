import { describe, expect, it } from "vitest";
import type { RuleFields } from "@/lib/eligibility/types";
import { toAnthropicMessages } from "./history";
import {
  BULK_CHECK_TOOL_NAME,
  BULK_PROPOSE_TOOL_NAME,
  type ChatMessage,
  type RuleProposal,
} from "./types";

const FIELDS: RuleFields = {
  payer_group: "Aetna",
  payer_id: "*",
  plan_type: "Commercial",
  group_number: "*",
  plan_structure: "PPO",
  service_state: "TX",
  serviceable: "No",
  pre_auth_required: "Needs Review",
  referral_required: "No",
  preventative_coverage: "Needs Review",
  last_verified: "",
  verified_by: "",
  notes: "",
};

function proposal(over: Partial<RuleProposal> = {}): RuleProposal {
  return {
    mode: "create",
    fields: FIELDS,
    rationale: "Mark Aetna PPO non-serviceable in TX.",
    toolUseId: "toolu_123",
    ...over,
  };
}

let n = 0;
function msg(over: Partial<ChatMessage>): ChatMessage {
  return { id: `m${n++}`, role: "user", text: "", ...over };
}

describe("toAnthropicMessages", () => {
  it("maps plain user and assistant turns to text messages", () => {
    const out = toAnthropicMessages([
      msg({ role: "user", text: "hi" }),
      msg({ role: "assistant", text: "hello" }),
    ]);
    expect(out).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("skips empty-text turns", () => {
    const out = toAnthropicMessages([
      msg({ role: "user", text: "   " }),
      msg({ role: "assistant", text: "" }),
      msg({ role: "user", text: "real" }),
    ]);
    expect(out).toEqual([{ role: "user", content: "real" }]);
  });

  it("pairs a confirmed proposal's tool_use with a tool_result", () => {
    const out = toAnthropicMessages([
      msg({ role: "user", text: "make it non-serviceable" }),
      msg({
        role: "assistant",
        text: "Here's the change.",
        proposal: proposal(),
        resolution: "confirmed",
        savedRuleId: "rule_9",
      }),
    ]);

    expect(out).toHaveLength(3);
    const assistant = out[1];
    expect(assistant.role).toBe("assistant");
    const blocks = assistant.content as { type: string; id?: string; name?: string }[];
    expect(blocks[0]).toMatchObject({ type: "text", text: "Here's the change." });
    expect(blocks[1]).toMatchObject({
      type: "tool_use",
      id: "toolu_123",
      name: "propose_rule_change",
    });

    const result = out[2];
    expect(result.role).toBe("user");
    const rblocks = result.content as { type: string; tool_use_id?: string; content?: string }[];
    expect(rblocks[0].type).toBe("tool_result");
    expect(rblocks[0].tool_use_id).toBe("toolu_123");
    expect(rblocks[0].content).toContain("rule_9");
  });

  it("emits a discard tool_result that asks for a revision", () => {
    const out = toAnthropicMessages([
      msg({
        role: "assistant",
        text: "",
        proposal: proposal(),
        resolution: "discarded",
      }),
    ]);
    // assistant(tool_use, no text block) + user(tool_result)
    expect(out).toHaveLength(2);
    const blocks = out[0].content as { type: string }[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("tool_use");
    const rblocks = out[1].content as { content?: string }[];
    expect(rblocks[0].content?.toLowerCase()).toContain("discarded");
  });

  it("drops an unresolved proposal entirely (no dangling tool_use)", () => {
    const out = toAnthropicMessages([
      msg({ role: "user", text: "edit it" }),
      msg({ role: "assistant", text: "Proposing…", proposal: proposal() }),
    ]);
    // The unresolved proposal turn is omitted; only the user message remains.
    expect(out).toEqual([{ role: "user", content: "edit it" }]);
  });

  it("preserves the exact toolUseId for pairing", () => {
    const out = toAnthropicMessages([
      msg({
        role: "assistant",
        text: "x",
        proposal: proposal({ toolUseId: "toolu_unique_42" }),
        resolution: "confirmed",
        savedRuleId: "r1",
      }),
    ]);
    const useBlock = (out[0].content as { type: string; id?: string }[]).find(
      (b) => b.type === "tool_use",
    );
    const resultBlock = (out[1].content as { tool_use_id?: string }[])[0];
    expect(useBlock?.id).toBe("toolu_unique_42");
    expect(resultBlock.tool_use_id).toBe("toolu_unique_42");
  });

  it("appends an attachment note to the user text", () => {
    const out = toAnthropicMessages([
      msg({
        role: "user",
        text: "check these",
        attachment: {
          kind: "member_queries",
          count: 2,
          columns: ["payer_group", "plan_type"],
          queries: [],
        },
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain("check these");
    expect(out[0].content).toContain("[Attached 2 member rows");
  });

  it("reconstructs an executed bulk check as tool_use + tool_result + prose", () => {
    const out = toAnthropicMessages([
      msg({ role: "user", text: "run it" }),
      msg({
        role: "assistant",
        text: "All clean.",
        bulkCheck: { toolUseId: "tu_1", results: [] },
      }),
    ]);
    expect(out).toHaveLength(4);
    const useBlock = (out[1].content as { type: string; name?: string }[])[0];
    expect(useBlock).toMatchObject({ type: "tool_use", name: BULK_CHECK_TOOL_NAME });
    const resultBlock = (out[2].content as { type: string; tool_use_id?: string }[])[0];
    expect(resultBlock).toMatchObject({ type: "tool_result", tool_use_id: "tu_1" });
    expect(out[3].content).toBe("All clean.");
  });

  it("drops an unresolved bulk proposal", () => {
    const out = toAnthropicMessages([
      msg({
        role: "assistant",
        text: "Proposing a batch…",
        bulkProposal: { toolUseId: "tu_2", rationale: "r", ops: [{ mode: "create", fields: FIELDS }] },
      }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("pairs a resolved bulk proposal's tool_use with a tool_result", () => {
    const out = toAnthropicMessages([
      msg({
        role: "assistant",
        text: "Batch ready.",
        bulkProposal: { toolUseId: "tu_2", rationale: "r", ops: [{ mode: "create", fields: FIELDS }] },
        resolution: "confirmed",
      }),
    ]);
    expect(out).toHaveLength(2);
    const useBlock = (out[0].content as { type: string; name?: string }[]).find(
      (b) => b.type === "tool_use",
    );
    expect(useBlock?.name).toBe(BULK_PROPOSE_TOOL_NAME);
    const resultBlock = (out[1].content as { tool_use_id?: string; content?: string }[])[0];
    expect(resultBlock.tool_use_id).toBe("tu_2");
    expect(resultBlock.content).toContain("applied");
  });
});

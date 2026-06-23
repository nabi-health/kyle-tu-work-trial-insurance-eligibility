"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatComposer, type ChatComposerHandle } from "./ChatComposer";
import { ChatMarkdown } from "./ChatMarkdown";
import { RuleProposalCard } from "./RuleProposalCard";
import { BulkRuleProposalCard } from "./BulkRuleProposalCard";
import { ChatBulkResults } from "./ChatBulkResults";
import { ChatRuleCard } from "./ChatRuleCard";
import { referencedRules } from "./rule-mentions";
import { attachmentNote } from "@/lib/chat/history";
import type {
  ChatAttachment,
  ChatMessage,
  ChatStreamEvent,
  ProposalResolution,
} from "@/lib/chat/types";
import type { Rule } from "@/lib/eligibility/types";

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

/** Starter prompts shown on a new chat — clicking loads one into the composer. */
const EXAMPLE_PROMPTS = [
  "Make Aetna PPO non-serviceable in Texas",
  "Add a rule: Cigna Commercial in WA is serviceable with no referral",
  "Show me the Kaiser HMO rules in California",
];

/**
 * The multiturn assistant. Holds the conversation client-side and re-POSTs the
 * full history to /api/chat each turn (the API is stateless). An assistant turn
 * may carry a rule proposal, rendered as a verification card the user confirms
 * or discards before anything is written.
 */
export function ChatPanel({
  rules,
  initialPrompt,
  initialMessages,
  onMessagesChange,
}: {
  rules: Rule[];
  initialPrompt?: string;
  /** Hydrate from a previously-saved conversation. */
  initialMessages?: ChatMessage[];
  /** Called whenever the conversation changes, so a parent can persist it. */
  onMessagesChange?: (messages: ChatMessage[]) => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages ?? [],
  );
  const [streaming, setStreaming] = useState(false);
  const composerRef = useRef<ChatComposerHandle>(null);

  // Report conversation changes upward (for persistence).
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // The latest assistant proposal must be resolved before we can send again —
  // its dangling tool_use would otherwise be rejected by the API.
  const pendingProposal = messages.some(
    (m) => (m.proposal || m.bulkProposal) && !m.resolution,
  );
  const inputDisabled = streaming || pendingProposal;

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Rules the assistant referenced in a message (via [R#] token or id) — rendered
  // inline as cards, excluding an edit's target rule (the proposal card shows it).
  function rulesForMessage(m: ChatMessage): Rule[] {
    if (m.role !== "assistant" || m.error || !m.text) return [];
    return referencedRules(m.text, rules).filter(
      (r) => r.id !== m.proposal?.target_rule_id,
    );
  }

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function patch(id: string, fn: (m: ChatMessage) => ChatMessage) {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }

  async function send(text: string, attachment?: ChatAttachment) {
    const userMsg: ChatMessage = { id: uid(), role: "user", text, attachment };
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
    };
    const outgoing = [...messagesRef.current, userMsg];
    setMessages([...outgoing, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      const handle = (event: ChatStreamEvent) => {
        if (event.type === "text") {
          patch(assistantId, (m) => ({ ...m, text: m.text + event.delta }));
        } else if (event.type === "proposal") {
          patch(assistantId, (m) => ({ ...m, proposal: event.proposal }));
        } else if (event.type === "bulk_proposal") {
          patch(assistantId, (m) => ({ ...m, bulkProposal: event.proposal }));
        } else if (event.type === "bulk_check") {
          patch(assistantId, (m) => ({ ...m, bulkCheck: event.payload }));
        } else if (event.type === "error") {
          patch(assistantId, (m) => ({
            ...m,
            text: event.message,
            error: true,
          }));
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) handle(JSON.parse(line) as ChatStreamEvent);
        }
      }
      const tail = buf.trim();
      if (tail) handle(JSON.parse(tail) as ChatStreamEvent);
    } catch {
      patch(assistantId, (m) => ({
        ...m,
        text:
          m.text ||
          "Something went wrong talking to the assistant. Please try again.",
        error: true,
      }));
    } finally {
      setStreaming(false);
    }
  }

  function resolveProposal(
    id: string,
    resolution: ProposalResolution,
    savedRuleId?: string,
  ) {
    patch(id, (m) => ({ ...m, resolution, savedRuleId }));
  }

  // Auto-submit a prompt handed off from the dashboard hero, exactly once, then
  // strip ?q so a refresh doesn't resend it.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const prompt = initialPrompt?.trim();
    if (prompt) {
      router.replace("/assistant");
      send(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empty state: a large centered composer.
  if (messages.length === 0) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 py-16">
        <h1 className="type-title-h3 text-ink">How can I help?</h1>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => composerRef.current?.setText(ex)}
              className="focus-ring rounded-full border border-line bg-surface px-3.5 py-2 type-body-sm text-muted transition-colors hover:border-secondary hover:text-ink"
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="w-full">
          <ChatComposer
            ref={composerRef}
            onSubmit={send}
            disabled={inputDisabled}
            variant="hero"
            autoFocus
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="scroll-area-bare flex-1 space-y-5 overflow-y-auto px-1 py-6">
        {messages.map((m) => {
          const refs = rulesForMessage(m);
          return (
            <div key={m.id}>
              <MessageBubble message={m} streaming={streaming} rules={rules} />
              {refs.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {refs.map((r) => (
                    <ChatRuleCard key={r.id} rule={r} />
                  ))}
                </div>
              )}
              {m.proposal && (
                <div className="mt-3">
                  <RuleProposalCard
                    proposal={m.proposal}
                    rules={rules}
                    resolution={m.resolution}
                    savedRuleId={m.savedRuleId}
                    onResolved={(res, savedId) =>
                      resolveProposal(m.id, res, savedId)
                    }
                  />
                </div>
              )}
              {m.bulkCheck && (
                <div className="mt-3">
                  <ChatBulkResults results={m.bulkCheck.results} />
                </div>
              )}
              {m.bulkProposal && (
                <div className="mt-3">
                  <BulkRuleProposalCard
                    proposal={m.bulkProposal}
                    rules={rules}
                    resolution={m.resolution}
                    onResolved={(res) => resolveProposal(m.id, res)}
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-cream/80 pb-4 pt-2 backdrop-blur">
        <ChatComposer onSubmit={send} disabled={inputDisabled} />
        {pendingProposal && (
          <p className="mt-2 px-1 type-body-xs text-subtle">
            Confirm or discard the proposed change to continue.
          </p>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
  rules,
}: {
  message: ChatMessage;
  streaming: boolean;
  rules: Rule[];
}) {
  const isUser = message.role === "user";
  const showCursor =
    streaming &&
    message.role === "assistant" &&
    message.text === "" &&
    !message.proposal &&
    !message.bulkProposal &&
    !message.bulkCheck;

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.text && (
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 type-body-sm text-white">
            {message.text}
          </div>
        )}
        {message.attachment && (
          <div className="rounded-xl border border-line bg-cream px-3 py-1.5 type-label-xs text-muted">
            {attachmentNote(message.attachment)}
          </div>
        )}
      </div>
    );
  }

  if (!message.text && !showCursor) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-surface px-4 py-3 ring-1 ring-line shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
        {showCursor ? (
          <span className="type-body-sm text-subtle">Thinking…</span>
        ) : message.error ? (
          <p className="type-body-sm text-danger">{message.text}</p>
        ) : (
          <ChatMarkdown rules={rules}>{message.text}</ChatMarkdown>
        )}
      </div>
    </div>
  );
}

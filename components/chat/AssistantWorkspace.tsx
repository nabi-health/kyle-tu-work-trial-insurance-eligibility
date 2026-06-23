"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteChatAction,
  listChatsAction,
  saveChatAction,
} from "@/app/assistant/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useUser } from "@/components/user/UserProvider";
import { ChatPanel } from "./ChatPanel";
import { chatTitle, timeAgo } from "@/lib/chat/storage";
import type { ChatMessage, SavedChat } from "@/lib/chat/types";
import type { Rule } from "@/lib/eligibility/types";

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

/**
 * Wraps the chat with persisted history: a toolbar (New chat + History) and a
 * dialog listing saved conversations. History is stored in Supabase, scoped by
 * the current user's name (the editable identity), and loaded via server
 * actions. The active conversation is keyed so switching remounts the ChatPanel
 * with its messages. Lives on the assistant page — not in the global sidebar.
 */
export function AssistantWorkspace({
  rules,
  initialPrompt,
}: {
  rules: Rule[];
  initialPrompt?: string;
}) {
  const { name, ready } = useUser();
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [activeId, setActiveId] = useState<string>(() => uid());
  const [historyOpen, setHistoryOpen] = useState(false);
  // The dashboard handoff prompt is consumed once, by the first chat only.
  const [pendingPrompt, setPendingPrompt] = useState(initialPrompt);

  // Load this user's saved chats once their name is known, and reload if the
  // name changes (renaming switches whose history you see).
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    listChatsAction(name).then((loaded) => {
      if (!cancelled) setChats(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [name, ready]);

  const active = chats.find((c) => c.id === activeId);

  // Throttle persistence: ChatPanel reports on every token; flush at most ~1x/s.
  const latestRef = useRef<ChatMessage[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timerRef.current = null;
    const messages = latestRef.current;
    if (!messages || messages.length === 0) return;
    const title = chatTitle(messages);
    const now = Date.now();
    setChats((prev) => {
      const existing = prev.find((c) => c.id === activeId);
      const updated: SavedChat = {
        id: activeId,
        title,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages,
      };
      return [updated, ...prev.filter((c) => c.id !== activeId)];
    });
    // Persist in the background; the optimistic update above keeps the UI live.
    saveChatAction(name, { id: activeId, title, messages }).catch(() => {});
  }, [activeId, name]);

  const onMessagesChange = useCallback(
    (messages: ChatMessage[]) => {
      latestRef.current = messages;
      if (timerRef.current) return;
      timerRef.current = setTimeout(flush, 900);
    },
    [flush],
  );

  function flushNow() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      flush();
    }
    latestRef.current = null;
    // Switching chats ends the handoff — don't re-submit the dashboard prompt.
    setPendingPrompt(undefined);
  }

  function newChat() {
    flushNow();
    setActiveId(uid());
    setHistoryOpen(false);
  }

  function openChat(id: string) {
    flushNow();
    setActiveId(id);
    setHistoryOpen(false);
  }

  function deleteChat(id: string) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    deleteChatAction(name, id).catch(() => {});
    if (id === activeId) {
      latestRef.current = null;
      setActiveId(uid());
    }
  }

  const initialMessages = active?.messages;
  const title = active?.title ?? "New chat";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line py-3">
        <p className="min-w-0 truncate type-label-md text-ink">{title}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={newChat}>
            New chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            disabled={chats.length === 0}
          >
            History{chats.length ? ` (${chats.length})` : ""}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ChatPanel
          key={activeId}
          rules={rules}
          initialPrompt={initialMessages ? undefined : pendingPrompt}
          initialMessages={initialMessages}
          onMessagesChange={onMessagesChange}
        />
      </div>

      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Chat history"
      >
        {chats.length === 0 ? (
          <p className="type-body-sm text-muted">No saved chats yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {chats.map((c) => (
              <li key={c.id} className="group flex items-center gap-1">
                <button
                  onClick={() => openChat(c.id)}
                  className="focus-ring min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-filler/40"
                >
                  <span
                    className={`block truncate type-body-sm ${
                      c.id === activeId ? "text-primary" : "text-ink"
                    }`}
                  >
                    {c.title}
                  </span>
                  <span className="block type-body-xs text-subtle">
                    {timeAgo(c.updatedAt)}
                    {c.id === activeId ? " · current" : ""}
                  </span>
                </button>
                <button
                  onClick={() => deleteChat(c.id)}
                  aria-label="Delete chat"
                  className="focus-ring rounded-lg px-2 py-2 type-body-sm text-subtle transition-colors hover:text-danger"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

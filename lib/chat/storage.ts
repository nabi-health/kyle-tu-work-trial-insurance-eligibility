import type { ChatMessage } from "./types";

/** Derive a short title from the first user message. */
export function chatTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user" && m.text.trim());
  const base = first?.text.trim() || "New chat";
  return base.length > 48 ? `${base.slice(0, 48)}…` : base;
}

/** Compact "x minutes ago" style label for the history list. */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

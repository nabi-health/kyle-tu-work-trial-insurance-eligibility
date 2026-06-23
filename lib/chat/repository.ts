import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ChatMessage, SavedChat } from "./types";

const TABLE = "assistant_chats";
const COLUMNS = "id,user_name,title,messages,created_at,updated_at";

/** What the client sends to persist a conversation (timestamps owned by the DB). */
export interface ChatInput {
  id: string;
  title: string;
  messages: ChatMessage[];
}

/* ------------------------------------------------------------------ *
 * In-memory fallback — used when Supabase isn't configured or the
 * assistant_chats table hasn't been migrated yet, so the assistant
 * keeps working (history just won't survive a server restart).
 * ------------------------------------------------------------------ */
const memory = new Map<string, SavedChat[]>();
let warned = false;

function warn(op: string, err: unknown) {
  if (warned) return;
  warned = true;
  console.warn(
    `[chat] Supabase unavailable (${op}: ${
      err instanceof Error ? err.message : String(err)
    }). Falling back to in-memory chat history. Run supabase/setup.sql (or migration 0002) to persist.`,
  );
}

function memList(userName: string): SavedChat[] {
  return [...(memory.get(userName) ?? [])].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

function memSave(userName: string, input: ChatInput): void {
  const list = memory.get(userName) ?? [];
  const now = Date.now();
  const existing = list.find((c) => c.id === input.id);
  const updated: SavedChat = {
    id: input.id,
    title: input.title,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages: input.messages,
  };
  memory.set(userName, [
    updated,
    ...list.filter((c) => c.id !== input.id),
  ]);
}

interface Row {
  id: string;
  user_name: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

function mapRow(row: Row): SavedChat {
  return {
    id: row.id,
    title: row.title,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
    messages: Array.isArray(row.messages) ? row.messages : [],
  };
}

/** All of a user's saved chats, newest first. */
export async function listChats(userName: string): Promise<SavedChat[]> {
  const db = getSupabaseAdmin();
  if (!db) return memList(userName);
  try {
    const { data, error } = await db
      .from(TABLE)
      .select(COLUMNS)
      .eq("user_name", userName)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapRow);
  } catch (err) {
    warn("listChats", err);
    return memList(userName);
  }
}

/** Create or update one conversation for a user. */
export async function saveChat(
  userName: string,
  input: ChatInput,
): Promise<void> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { error } = await db.from(TABLE).upsert({
        id: input.id,
        user_name: userName,
        title: input.title,
        messages: input.messages,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      warn("saveChat", err);
    }
  }
  memSave(userName, input);
}

/** Delete one conversation (scoped to the owning user). */
export async function deleteChat(
  userName: string,
  id: string,
): Promise<void> {
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { error } = await db
        .from(TABLE)
        .delete()
        .eq("id", id)
        .eq("user_name", userName);
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      warn("deleteChat", err);
    }
  }
  const list = memory.get(userName);
  if (list) memory.set(userName, list.filter((c) => c.id !== id));
}

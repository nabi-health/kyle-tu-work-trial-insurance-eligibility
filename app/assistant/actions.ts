"use server";

import {
  deleteChat,
  listChats,
  saveChat,
  type ChatInput,
} from "@/lib/chat/repository";
import type { SavedChat } from "@/lib/chat/types";

/** All saved conversations for a user, newest first. */
export async function listChatsAction(userName: string): Promise<SavedChat[]> {
  return listChats(userName);
}

/** Create or update a conversation for a user. */
export async function saveChatAction(
  userName: string,
  chat: ChatInput,
): Promise<void> {
  await saveChat(userName, chat);
}

/** Delete a conversation owned by a user. */
export async function deleteChatAction(
  userName: string,
  id: string,
): Promise<void> {
  await deleteChat(userName, id);
}

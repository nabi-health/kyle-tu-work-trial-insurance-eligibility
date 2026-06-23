"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "nabi.user.name";
/** Fallback when no name has been set yet. */
export const DEFAULT_USER = "Registry Admin";

type UserContextValue = {
  /** The current user's display name (used as the actor on saves). */
  name: string;
  setName: (name: string) => void;
  /** True once localStorage has been read (post-hydration). */
  ready: boolean;
};

const Ctx = createContext<UserContextValue | null>(null);

/**
 * A tiny client-side identity store backed by localStorage. There's no auth in
 * this tool, so the user just types who they are; the name is attributed as the
 * actor on every rule save.
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState(DEFAULT_USER);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim()) setNameState(stored);
    } catch {
      // Ignore — private mode / disabled storage falls back to the default.
    }
    setReady(true);
  }, []);

  function setName(next: string) {
    const trimmed = next.trim() || DEFAULT_USER;
    setNameState(trimmed);
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      // Ignore write failures; the in-memory value still applies this session.
    }
  }

  return (
    <Ctx.Provider value={{ name, setName, ready }}>{children}</Ctx.Provider>
  );
}

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}

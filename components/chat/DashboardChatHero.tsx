"use client";

import { useRouter } from "next/navigation";
import { ChatComposer } from "./ChatComposer";

/**
 * The dashboard hero composer. Typing here hands the prompt off to the dedicated
 * /assistant page (via ?q), which auto-submits it and continues the conversation.
 */
export function DashboardChatHero() {
  const router = useRouter();

  function start(text: string) {
    router.push(`/assistant?q=${encodeURIComponent(text)}`);
  }

  return (
    <section className="flex flex-col items-center gap-10 rounded-2xl border border-line bg-surface px-6 py-20 text-center gap-y-20 shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
      <div className="max-w-xl">
        <h2 className="type-title-h4 text-ink">Ask the registry assistant</h2>
        <p className="mt-2 type-body-md text-muted">
          Create or edit a rule in plain language. The assistant drafts the
          change and shows a preview for you to confirm before it&apos;s saved.
        </p>
      </div>
      <div className="relative isolate w-full max-w-2xl">
        {/* Accent aura — the five brand accents bloom behind the input as one
            soft coloured shadow. Decorative; the opaque composer sits on top so
            the colour reads as a halo around its edges. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-2 -top-3 -bottom-4 -z-10 rounded-[2rem] opacity-65 blur-2xl"
          style={{
            background: [
              "radial-gradient(40% 60% at 12% 50%, var(--color-accent-pink) 0%, transparent 72%)",
              "radial-gradient(38% 60% at 38% 50%, var(--color-accent-yellow) 0%, transparent 72%)",
              "radial-gradient(40% 65% at 60% 50%, var(--color-accent-orange) 0%, transparent 72%)",
              "radial-gradient(38% 60% at 80% 50%, var(--color-accent-green) 0%, transparent 72%)",
              "radial-gradient(40% 60% at 95% 50%, var(--color-accent-blue) 0%, transparent 72%)",
            ].join(", "),
          }}
        />
        <ChatComposer
          onSubmit={start}
          variant="hero"
          placeholder="e.g. Make Aetna PPO non-serviceable in Texas…"
        />
      </div>
    </section>
  );
}

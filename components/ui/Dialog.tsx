"use client";

import { useEffect } from "react";
import { NabiCharacter, type NabiName } from "@/components/brand/NabiCharacter";
import { cn } from "@/lib/cn";

/** Lightweight modal — overlay + centered panel, closes on Esc / backdrop. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  character,
  maxWidthClass = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional Nabi companion shown above the title for key moments. */
  character?: NabiName;
  /** Tailwind max-width for the panel. Defaults to a compact modal. */
  maxWidthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-result w-full ${maxWidthClass} rounded-2xl border border-line bg-surface shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "border-b border-line px-5 py-4",
            character && "flex flex-col items-center gap-2 pt-5 text-center",
          )}
        >
          {character && <NabiCharacter name={character} size={44} />}
          <h2 className="type-title-h6 text-ink">{title}</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 type-body-sm text-muted">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

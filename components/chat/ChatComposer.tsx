"use client";

import { useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MAX_UPLOAD_BYTES } from "@/lib/check/upload";
import type { RowError } from "@/lib/check/validation";
import {
  type AttachmentKind,
  looksLikeDataset,
  parseAttachmentText,
} from "@/lib/chat/upload";
import type { ChatAttachment } from "@/lib/chat/types";

type Variant = "hero" | "bar";

/** Imperative handle so a parent can load text into the box (e.g. an example). */
export interface ChatComposerHandle {
  setText: (text: string) => void;
}

/** Raw source of a pending attachment, kept so the kind toggle can re-parse it. */
type AttachSource = { text: string; isJson: boolean };

type AttachError = { fileError?: string; rowErrors?: RowError[] };

/**
 * The chat text input — a large centered box in the dashboard hero ("hero") and
 * a compact bottom bar on the assistant page ("bar"). Enter sends; Shift+Enter
 * inserts a newline. A CSV/JSON dataset can be attached (📎) or pasted; it rides
 * with the next message as a chip rather than dumping rows into the textarea.
 */
export function ChatComposer({
  onSubmit,
  disabled = false,
  variant = "bar",
  placeholder = "Describe a rule, or attach a CSV to check or import…",
  autoFocus = false,
  ref,
}: {
  onSubmit: (text: string, attachment?: ChatAttachment) => void;
  disabled?: boolean;
  variant?: Variant;
  placeholder?: string;
  autoFocus?: boolean;
  ref?: React.Ref<ChatComposerHandle>;
}) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [source, setSource] = useState<AttachSource | null>(null);
  const [attachError, setAttachError] = useState<AttachError | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      setText(text: string) {
        setValue(text);
        const el = taRef.current;
        if (el) {
          el.focus();
          requestAnimationFrame(() => {
            el.style.height = "";
            const max = variant === "hero" ? 240 : 160;
            el.style.height = `${Math.min(el.scrollHeight, max)}px`;
          });
        }
      },
    }),
    [variant],
  );

  function clearAttachment() {
    setAttachment(null);
    setSource(null);
    setAttachError(null);
  }

  function applyParse(src: AttachSource, force?: AttachmentKind) {
    const res = parseAttachmentText(src.text, { isJson: src.isJson, force });
    if (res.ok) {
      setAttachment(res.attachment);
      setSource(src);
      setAttachError(null);
    } else {
      setAttachment(null);
      setSource(null);
      setAttachError({ fileError: res.fileError, rowErrors: res.rowErrors });
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    clearAttachment();

    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isJson = name.endsWith(".json");
    if (!isCsv && !isJson) {
      setAttachError({ fileError: "Attach a .csv or .json file." });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setAttachError({ fileError: "File is too large (max 2 MB)." });
      return;
    }
    applyParse({ text: await file.text(), isJson });
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    // Only intercept a paste that clearly looks like a dataset; otherwise let it
    // land in the textarea as normal text.
    const text = e.clipboardData.getData("text");
    if (!attachment && looksLikeDataset(text)) {
      e.preventDefault();
      applyParse({ text, isJson: text.trim().startsWith("[") });
    }
  }

  /** Flip the inferred kind (member check ↔ rule import) and re-parse. */
  function toggleKind() {
    if (!source || !attachment) return;
    const next: AttachmentKind =
      attachment.kind === "member_queries" ? "rule_rows" : "member_queries";
    applyParse(source, next);
  }

  const canSend = (value.trim() !== "" || attachment !== null) && !disabled;

  function submit() {
    if (!canSend) return;
    onSubmit(value.trim(), attachment ?? undefined);
    setValue("");
    clearAttachment();
    if (taRef.current) taRef.current.style.height = "";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "";
    const max = variant === "hero" ? 240 : 160;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }

  return (
    <div className="flex flex-col gap-2">
      {attachment && (
        <AttachmentChip
          attachment={attachment}
          onToggleKind={toggleKind}
          onRemove={clearAttachment}
        />
      )}
      {attachError && <AttachErrorBanner error={attachError} />}

      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-surface px-3 transition-colors focus-within:border-secondary",
          variant === "hero" ? "py-2.5" : "py-1.5",
          disabled ? "border-line opacity-80" : "border-line-strong",
          variant === "hero" && "shadow-[0_1px_2px_rgba(10,10,10,0.04)]",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          onChange={onFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label="Attach a CSV or JSON dataset"
          title="Attach a CSV or JSON dataset"
          className="focus-ring mb-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-row-selected hover:text-ink disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={taRef}
          value={value}
          autoFocus={autoFocus}
          rows={variant === "hero" ? 3 : 1}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className={cn(
            "flex-1 resize-none bg-transparent px-1 text-ink outline-none placeholder:text-subtle",
            variant === "hero" ? "py-1.5 type-body-md" : "py-1 type-body-sm",
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "focus-ring mb-0.5 inline-flex shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-600 active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40",
            variant === "hero" ? "h-9 w-9" : "h-6 w-6",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** A pill describing the pending dataset, with a kind toggle and a remove ✕. */
function AttachmentChip({
  attachment,
  onToggleKind,
  onRemove,
}: {
  attachment: ChatAttachment;
  onToggleKind: () => void;
  onRemove: () => void;
}) {
  const isRule = attachment.kind === "rule_rows";
  const label = isRule
    ? `${attachment.count} rule${attachment.count === 1 ? "" : "s"} · CSV import`
    : `${attachment.count} member row${attachment.count === 1 ? "" : "s"}`;

  return (
    <div className="flex w-fit items-center gap-2 rounded-xl border border-line bg-cream px-3 py-1.5">
      <span className="type-label-xs text-ink">📎 {label}</span>
      <button
        type="button"
        onClick={onToggleKind}
        className="focus-ring rounded-md px-1.5 py-0.5 type-body-xs text-primary hover:underline"
        title="Switch between running an eligibility check and importing rules"
      >
        {isRule ? "Check instead" : "Import as rules"}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className="focus-ring rounded-md px-1 text-subtle hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}

/** Inline error surface for a rejected attachment (mirrors the bulk sandbox). */
function AttachErrorBanner({ error }: { error: AttachError }) {
  if (error.fileError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-bg/60 px-3 py-2">
        <p className="type-body-xs text-danger">{error.fileError}</p>
      </div>
    );
  }
  const rows = error.rowErrors ?? [];
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-bg/60 px-3 py-2">
      <p className="type-label-xs text-ink">
        Dataset rejected — {rows.length} problem{rows.length === 1 ? "" : "s"} found.
      </p>
      <ul className="mt-1 max-h-32 overflow-y-auto type-body-xs text-muted">
        {rows.slice(0, 20).map((er, i) => (
          <li key={i}>
            Line {er.row} · {er.column}: {er.message}
          </li>
        ))}
      </ul>
      {rows.length > 20 && (
        <p className="mt-1 type-body-xs text-subtle">Showing first 20 of {rows.length}.</p>
      )}
    </div>
  );
}

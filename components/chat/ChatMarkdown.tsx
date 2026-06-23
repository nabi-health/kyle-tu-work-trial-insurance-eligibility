"use client";

import { useMemo } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { Rule } from "@/lib/eligibility/types";
import { relabelRuleMentions } from "./rule-mentions";

/**
 * Element styling for assistant markdown. The app has no `prose` plugin, so each
 * element maps to the design tokens. `remark-breaks` turns single newlines into
 * line breaks; `remark-gfm` adds tables, strikethrough, and autolinks.
 */
const COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="leading-relaxed [&:not(:first-child)]:mt-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => (
    <h1 className="mb-1 mt-3 type-title-h6 text-ink">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1 mt-3 type-title-h6 text-ink">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-3 type-label-md text-ink">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-line pl-3 text-muted">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) return <code className={className}>{children}</code>;
    return (
      <code className="rounded bg-cream px-1 py-0.5 font-mono text-[0.85em] text-ink">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-cream p-3 font-mono text-[0.85em] ring-1 ring-line">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-line" />,
  table: ({ children }) => (
    <table className="my-2 w-full border-collapse text-left">{children}</table>
  ),
  th: ({ children }) => (
    <th className="border-b border-line px-2 py-1 type-label-xs text-subtle">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-line px-2 py-1">{children}</td>
  ),
};

/** Renders an assistant message as markdown, with rule references shown legibly. */
export function ChatMarkdown({
  children,
  rules = [],
}: {
  children: string;
  rules?: Rule[];
}) {
  const text = useMemo(
    () => relabelRuleMentions(children, rules),
    [children, rules],
  );

  return (
    <div className="type-body-sm text-ink">
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={COMPONENTS}>
        {text}
      </Markdown>
    </div>
  );
}

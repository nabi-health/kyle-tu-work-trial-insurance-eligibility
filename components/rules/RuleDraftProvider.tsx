"use client";

import { createContext, useContext, useState } from "react";
import type { PreviewResult } from "@/app/rules/actions";
import type { Rule, RuleFields } from "@/lib/eligibility/types";
import { EMPTY, nextStateSelection, stripId } from "./rule-helpers";

type RuleDraft = {
  /** The saved rule, as it currently exists in the registry. */
  rule: Rule;
  ruleId: string;
  fields: RuleFields;
  setField: <K extends keyof RuleFields>(key: K, value: string) => void;
  setStates: (next: string[]) => void;
  tab: "form" | "json";
  switchTab: (next: "form" | "json") => void;
  jsonDraft: string;
  setJsonDraft: (value: string) => void;
  jsonError: string | null;
  setJsonError: (value: string | null) => void;
  errors: Record<string, string>;
  setErrors: (value: Record<string, string>) => void;
  preview: PreviewResult | null;
  setPreview: (value: PreviewResult | null) => void;
  saving: boolean;
  setSaving: (value: boolean) => void;
  /** Resolve the payload from whichever editor (form/JSON) is active. */
  payload: () => unknown | null;
  /** Discard unsaved edits and reset back to the saved rule. */
  reset: () => void;
};

const Ctx = createContext<RuleDraft | null>(null);

/**
 * Holds the in-flight edit draft for one rule. Mounted by the rule's layout so
 * the draft survives navigation between the edit and verify routes (Next keeps
 * the layout — and this provider — mounted across its child pages).
 */
export function RuleDraftProvider({
  rule,
  children,
}: {
  rule: Rule;
  children: React.ReactNode;
}) {
  const [fields, setFields] = useState<RuleFields>(() => stripId(rule));
  const [tab, setTab] = useState<"form" | "json">("form");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof RuleFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function setStates(next: string[]) {
    setFields((f) => ({
      ...f,
      service_state: nextStateSelection(f.service_state, next),
    }));
  }

  function switchTab(next: "form" | "json") {
    if (next === tab) return;
    if (next === "json") {
      setJsonDraft(JSON.stringify(fields, null, 2));
      setJsonError(null);
    } else {
      // Pull JSON edits back into the form; block the switch if unparseable.
      try {
        setFields({ ...EMPTY, ...JSON.parse(jsonDraft) });
        setJsonError(null);
      } catch {
        setJsonError("Fix the JSON before switching back to the form.");
        return;
      }
    }
    setTab(next);
  }

  function payload(): unknown | null {
    if (tab === "json") {
      try {
        const parsed = JSON.parse(jsonDraft);
        setJsonError(null);
        return parsed;
      } catch {
        setJsonError("Invalid JSON syntax.");
        return null;
      }
    }
    return fields;
  }

  function reset() {
    setFields(stripId(rule));
    setTab("form");
    setJsonDraft("");
    setJsonError(null);
    setErrors({});
    setPreview(null);
  }

  return (
    <Ctx.Provider
      value={{
        rule,
        ruleId: rule.id,
        fields,
        setField,
        setStates,
        tab,
        switchTab,
        jsonDraft,
        setJsonDraft,
        jsonError,
        setJsonError,
        errors,
        setErrors,
        preview,
        setPreview,
        saving,
        setSaving,
        payload,
        reset,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRuleDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useRuleDraft must be used within a RuleDraftProvider");
  }
  return ctx;
}

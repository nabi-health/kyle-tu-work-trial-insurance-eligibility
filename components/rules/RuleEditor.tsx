"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  previewRule,
  saveRule,
  type PreviewResult,
} from "@/app/rules/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/Toggle";
import {
  OUTCOME_KEYS,
  OUTCOME_LABELS,
  OUTCOME_VALUES,
  PLAN_STRUCTURES,
  PLAN_TYPES,
} from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import type { OutcomeKey, Rule, RuleFields } from "@/lib/eligibility/types";

const EMPTY: RuleFields = {
  payer_group: "*",
  payer_id: "*",
  plan_type: "*",
  group_number: "*",
  plan_structure: "*",
  service_state: "*",
  serviceable: "Needs Review",
  pre_auth_required: "Needs Review",
  referral_required: "Needs Review",
  preventative_coverage: "Needs Review",
  last_verified: "",
  verified_by: "",
  notes: "",
};

function stripId(rule: Rule): RuleFields {
  const copy: Partial<Rule> = { ...rule };
  delete copy.id;
  return copy as RuleFields;
}
const display = (v: string) => (v.trim() === "*" || v === "" ? "Any" : v);

const wildcardOpts = (values: string[]) =>
  [{ value: "*", label: "Any (*)" }].concat(
    values.map((v) => ({ value: v, label: v })),
  );
const outcomeOpts = (key: OutcomeKey) =>
  OUTCOME_VALUES[key].map((v) => ({
    value: v,
    label: v === "*" ? "Any (*)" : v,
  }));

export function RuleEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Rule;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"form" | "json">("form");
  const [fields, setFields] = useState<RuleFields>(
    initial ? stripId(initial) : EMPTY,
  );
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof RuleFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
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

  /** Resolve the payload from whichever editor is active. */
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

  async function runPreview() {
    const p = payload();
    if (p === null) return;
    const result = await previewRule(p, initial?.id);
    setPreview(result);
    if (!result.ok) {
      setErrors(result.errors);
      if (result.formError) setJsonError(result.formError);
    } else {
      setErrors({});
    }
  }

  async function confirmSave() {
    if (!preview || !preview.ok) return;
    setSaving(true);
    const result = await saveRule(preview.data, initial?.id);
    if (result.ok) {
      router.push("/rules");
      router.refresh();
    } else {
      setSaving(false);
      setErrors(result.errors);
      setPreview(null);
    }
  }

  /* ----------------------------- Preview step ----------------------------- */
  if (preview?.ok) {
    const d = preview.data;
    return (
      <Card>
        <CardHeader>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Verify before saving
          </p>
          <h2 className="font-display text-lg font-semibold text-ink">
            Review this rule
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink">Applies to</p>
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{display(d.payer_group)}</span>{" "}
              · plan type {display(d.plan_type)} · {display(d.plan_structure)}{" "}
              structure · state(s) {display(d.service_state)}
              {d.payer_id.trim() !== "*" && d.payer_id.trim() !== "" && (
                <> · payer id {d.payer_id}</>
              )}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink">
              Asserts these outcomes
            </p>
            <div className="flex flex-wrap gap-2">
              {OUTCOME_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="text-xs text-subtle">
                    {OUTCOME_LABELS[k]}:
                  </span>
                  <Badge tone={outcomeTone(k, d[k])}>{display(d[k])}</Badge>
                </div>
              ))}
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded-xl bg-warning-bg px-4 py-3">
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-sm text-warning">
                  ⚠ {w.message}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={confirmSave} disabled={saving}>
              {saving ? "Saving…" : "Confirm & save"}
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Back to edit
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* ------------------------------ Edit step ------------------------------- */
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          {mode === "create" ? "New rule" : "Edit rule"}
        </h2>
        <SegmentedControl
          value={tab}
          onChange={(v) => switchTab(v)}
          size="sm"
          options={[
            { value: "form", label: "Form" },
            { value: "json", label: "JSON" },
          ]}
        />
      </CardHeader>
      <CardBody className="flex flex-col gap-6">
        {tab === "form" ? (
          <>
            <section className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                Match criteria
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Payer group" error={errors.payer_group}
                  hint="Payer name, or * for all">
                  <Input
                    value={fields.payer_group}
                    onChange={(e) => setField("payer_group", e.target.value)}
                  />
                </Field>
                <Field label="Payer ID(s)" error={errors.payer_id}
                  hint="Comma-separated, or *">
                  <Input
                    value={fields.payer_id}
                    onChange={(e) => setField("payer_id", e.target.value)}
                  />
                </Field>
                <Field label="Plan type" error={errors.plan_type}>
                  <Select
                    options={wildcardOpts(PLAN_TYPES)}
                    value={fields.plan_type}
                    onChange={(e) => setField("plan_type", e.target.value)}
                  />
                </Field>
                <Field label="Plan structure" error={errors.plan_structure}>
                  <Select
                    options={wildcardOpts(PLAN_STRUCTURES)}
                    value={fields.plan_structure}
                    onChange={(e) => setField("plan_structure", e.target.value)}
                  />
                </Field>
                <Field label="Group number" error={errors.group_number}>
                  <Input
                    value={fields.group_number}
                    onChange={(e) => setField("group_number", e.target.value)}
                  />
                </Field>
                <Field label="Service state(s)" error={errors.service_state}
                  hint="State code(s) e.g. CA,WA — or *">
                  <Input
                    value={fields.service_state}
                    onChange={(e) => setField("service_state", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                Outcomes
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {OUTCOME_KEYS.map((key) => (
                  <Field key={key} label={OUTCOME_LABELS[key]} error={errors[key]}>
                    <Select
                      options={outcomeOpts(key)}
                      value={fields[key]}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                Verification & notes
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Last verified" htmlFor="last_verified">
                  <Input
                    id="last_verified"
                    type="date"
                    value={fields.last_verified}
                    onChange={(e) => setField("last_verified", e.target.value)}
                  />
                </Field>
                <Field label="Verified by" htmlFor="verified_by">
                  <Input
                    id="verified_by"
                    value={fields.verified_by}
                    onChange={(e) => setField("verified_by", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Notes" htmlFor="notes" hint="Exceptions, sources, context">
                <Textarea
                  id="notes"
                  rows={3}
                  value={fields.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                />
              </Field>
            </section>
          </>
        ) : (
          <Field label="Rule JSON" error={jsonError ?? undefined}>
            <Textarea
              className="font-mono text-[13px]"
              rows={20}
              spellCheck={false}
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
            />
          </Field>
        )}

        <div className="flex items-center gap-2 border-t border-line pt-4">
          <Button onClick={runPreview}>Preview &amp; verify</Button>
          <Button variant="ghost" onClick={() => router.push("/rules")}>
            Cancel
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

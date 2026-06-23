"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
  OUTCOME_KEYS,
  OUTCOME_LABELS,
  PLAN_STRUCTURES,
  PLAN_TYPES,
} from "@/lib/eligibility/constants";
import type { RuleFields } from "@/lib/eligibility/types";
import {
  outcomeOpts,
  parseStates,
  stateOpts,
  wildcardOpts,
} from "./rule-helpers";

/**
 * The match-criteria / outcomes / notes form (or the raw JSON editor), driven
 * entirely by props. Shared by the create, edit and read-only view surfaces —
 * `disabled` renders every control non-interactive for the view.
 */
export function RuleFieldset({
  fields,
  setField,
  setStates,
  errors,
  disabled,
  tab,
  jsonDraft,
  setJsonDraft,
  jsonError,
}: {
  fields: RuleFields;
  setField: <K extends keyof RuleFields>(key: K, value: string) => void;
  setStates: (next: string[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  tab: "form" | "json";
  jsonDraft: string;
  setJsonDraft: (value: string) => void;
  jsonError: string | null;
}) {
  if (tab === "json") {
    return (
      <Field label="Rule JSON" error={jsonError ?? undefined}>
        <Textarea
          className="font-mono text-[13px]"
          disabled={disabled}
          rows={20}
          spellCheck={false}
          value={jsonDraft}
          onChange={(e) => setJsonDraft(e.target.value)}
        />
      </Field>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-4">
        <p className="type-subhead-2xs text-subtle">Match criteria</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payer group" error={errors.payer_group}
            hint="Payer name, or * for all">
            <Input
              disabled={disabled}
              value={fields.payer_group}
              onChange={(e) => setField("payer_group", e.target.value)}
            />
          </Field>
          <Field label="Payer ID(s)" error={errors.payer_id}
            hint="Comma-separated, or *">
            <Input
              disabled={disabled}
              value={fields.payer_id}
              onChange={(e) => setField("payer_id", e.target.value)}
            />
          </Field>
          <Field label="Plan type" error={errors.plan_type}>
            <Dropdown
              disabled={disabled}
              options={wildcardOpts(PLAN_TYPES)}
              value={fields.plan_type}
              onChange={(v) => setField("plan_type", v)}
            />
          </Field>
          <Field label="Plan structure" error={errors.plan_structure}>
            <Dropdown
              disabled={disabled}
              options={wildcardOpts(PLAN_STRUCTURES)}
              value={fields.plan_structure}
              onChange={(v) => setField("plan_structure", v)}
            />
          </Field>
          <Field label="Group number" error={errors.group_number}>
            <Input
              disabled={disabled}
              value={fields.group_number}
              onChange={(e) => setField("group_number", e.target.value)}
            />
          </Field>
          <Field label="Service state(s)" error={errors.service_state}
            hint="Pick specific states, or choose “All states”">
            <MultiSelect
              disabled={disabled}
              options={stateOpts}
              values={parseStates(fields.service_state)}
              onChange={setStates}
              emptyLabel="Select state(s)…"
              placeholder="Add state…"
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <p className="type-subhead-2xs text-subtle">Outcomes</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {OUTCOME_KEYS.map((key) => (
            <Field key={key} label={OUTCOME_LABELS[key]} error={errors[key]}>
              <Dropdown
                disabled={disabled}
                options={outcomeOpts(key)}
                value={fields[key]}
                onChange={(v) => setField(key, v)}
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <p className="type-subhead-2xs text-subtle">Notes</p>
        <Field
          label="Notes"
          htmlFor="notes"
          hint="Exceptions, sources, context. The verification date and author are recorded automatically when you save."
        >
          <Textarea
            id="notes"
            disabled={disabled}
            rows={3}
            value={fields.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </Field>
      </section>
    </>
  );
}

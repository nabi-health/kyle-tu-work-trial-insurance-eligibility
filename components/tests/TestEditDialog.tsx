"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { saveTest } from "@/app/check/tests/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Dropdown } from "@/components/ui/Dropdown";
import { Field, Input, Textarea } from "@/components/ui/Field";
import {
  OUTCOME_KEYS,
  OUTCOME_LABELS,
  PLAN_STRUCTURES,
  PLAN_TYPES,
  US_STATES,
} from "@/lib/eligibility/constants";
import { EXPECTED_VALUES } from "@/lib/tests/validation";
import type { EligibilityTest } from "@/lib/tests/types";

/** The flat wire shape (matches the validation schema). */
type Form = {
  name: string;
  payer_group: string;
  plan_type: string;
  plan_structure: string;
  service_state: string;
  expected_serviceable: string;
  expected_pre_auth_required: string;
  expected_referral_required: string;
  expected_preventative_coverage: string;
  notes: string;
};

const EMPTY: Form = {
  name: "",
  payer_group: "",
  plan_type: "",
  plan_structure: "",
  service_state: "",
  expected_serviceable: "",
  expected_pre_auth_required: "",
  expected_referral_required: "",
  expected_preventative_coverage: "",
  notes: "",
};

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

/** Flatten a stored test into the form shape for editing. */
function fromTest(t: EligibilityTest): Form {
  return {
    name: t.name,
    payer_group: t.payer_group,
    plan_type: t.plan_type,
    plan_structure: t.plan_structure,
    service_state: t.service_state,
    expected_serviceable: t.expected.serviceable,
    expected_pre_auth_required: t.expected.pre_auth_required,
    expected_referral_required: t.expected.referral_required,
    expected_preventative_coverage: t.expected.preventative_coverage,
    notes: t.notes,
  };
}

const EXPECTED_FIELD: Record<(typeof OUTCOME_KEYS)[number], keyof Form> = {
  serviceable: "expected_serviceable",
  pre_auth_required: "expected_pre_auth_required",
  referral_required: "expected_referral_required",
  preventative_coverage: "expected_preventative_coverage",
};

/** Create (test = null) or edit one eligibility test case. */
export function TestEditDialog({
  open,
  test,
  payerGroups,
  onClose,
  onSaved,
}: {
  open: boolean;
  test: EligibilityTest | null;
  payerGroups: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const payerListId = useId();

  // Reset the form whenever the dialog opens for a different test.
  useEffect(() => {
    if (open) {
      setForm(test ? fromTest(test) : EMPTY);
      setErrors({});
    }
  }, [open, test]);

  function set<K extends keyof Form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const result = await saveTest(form, test?.id);
      if (result.ok) {
        onSaved();
        onClose();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={test ? "Edit test case" : "Add test case"}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : test ? "Save changes" : "Add test"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Name" htmlFor="test-name" error={errors.name}>
          <Input
            id="test-name"
            placeholder="e.g. Happy Path — Serviceable"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <div>
          <p className="mb-3 type-subhead-2xs text-muted">Inputs</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payer" htmlFor="test-payer" error={errors.payer_group}>
              <Input
                id="test-payer"
                list={payerListId}
                placeholder="e.g. Cigna"
                value={form.payer_group}
                onChange={(e) => set("payer_group", e.target.value)}
              />
            </Field>
            <datalist id={payerListId}>
              {payerGroups.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Field
              label="Plan Type"
              htmlFor="test-plan-type"
              error={errors.plan_type}
            >
              <Dropdown
                id="test-plan-type"
                placeholder="Select a plan type"
                options={opts(PLAN_TYPES)}
                value={form.plan_type}
                onChange={(v) => set("plan_type", v)}
              />
            </Field>
            <Field
              label="Plan Structure"
              htmlFor="test-plan-structure"
              error={errors.plan_structure}
            >
              <Dropdown
                id="test-plan-structure"
                placeholder="Select a plan structure"
                options={opts(PLAN_STRUCTURES)}
                value={form.plan_structure}
                onChange={(v) => set("plan_structure", v)}
              />
            </Field>
            <Field
              label="State"
              htmlFor="test-state"
              error={errors.service_state}
            >
              <Dropdown
                id="test-state"
                placeholder="Select a state"
                options={opts(US_STATES)}
                value={form.service_state}
                onChange={(v) => set("service_state", v)}
              />
            </Field>
          </div>
        </div>

        <div>
          <p className="mb-3 type-subhead-2xs text-muted">Expected outputs</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {OUTCOME_KEYS.map((key) => {
              const field = EXPECTED_FIELD[key];
              return (
                <Field
                  key={key}
                  label={OUTCOME_LABELS[key]}
                  htmlFor={`test-${field}`}
                  error={errors[field]}
                >
                  <Dropdown
                    id={`test-${field}`}
                    placeholder="Select expected value"
                    options={opts(EXPECTED_VALUES[key])}
                    value={form[field]}
                    onChange={(v) => set(field, v)}
                  />
                </Field>
              );
            })}
          </div>
        </div>

        <Field
          label="Why (optional)"
          htmlFor="test-notes"
          error={errors.notes}
          hint="What this case is meant to prove — surfaced when a test fails."
        >
          <Textarea
            id="test-notes"
            rows={3}
            placeholder="e.g. Ohio is in the global blocked-states list…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
}

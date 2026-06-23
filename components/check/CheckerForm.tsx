"use client";

import { useState, useTransition } from "react";
import { checkEligibility } from "@/app/check/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { PLAN_STRUCTURES, PLAN_TYPES, US_STATES } from "@/lib/eligibility/constants";
import type { EligibilityQuery, EligibilityResult } from "@/lib/eligibility/types";
import { ResultCard } from "./ResultCard";

const EMPTY: EligibilityQuery = {
  payer_group: "",
  plan_type: "",
  plan_structure: "",
  service_state: "",
};

const opts = (values: string[]) =>
  values.map((v) => ({ value: v, label: v }));

export function CheckerForm({ payerGroups }: { payerGroups: string[] }) {
  const [query, setQuery] = useState<EligibilityQuery>(EMPTY);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [pending, startTransition] = useTransition();

  const complete =
    query.payer_group &&
    query.plan_type &&
    query.plan_structure &&
    query.service_state;

  function set<K extends keyof EligibilityQuery>(key: K, value: string) {
    setQuery((q) => ({ ...q, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    startTransition(async () => {
      setResult(await checkEligibility(query));
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <Card>
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Payer" htmlFor="payer_group">
              <Select
                id="payer_group"
                placeholder="Select a payer"
                options={opts(payerGroups)}
                value={query.payer_group}
                onChange={(e) => set("payer_group", e.target.value)}
              />
            </Field>
            <Field label="Plan Type" htmlFor="plan_type">
              <Select
                id="plan_type"
                placeholder="Select a plan type"
                options={opts(PLAN_TYPES)}
                value={query.plan_type}
                onChange={(e) => set("plan_type", e.target.value)}
              />
            </Field>
            <Field label="Plan Structure" htmlFor="plan_structure">
              <Select
                id="plan_structure"
                placeholder="Select a plan structure"
                options={opts(PLAN_STRUCTURES)}
                value={query.plan_structure}
                onChange={(e) => set("plan_structure", e.target.value)}
              />
            </Field>
            <Field label="State" htmlFor="service_state">
              <Select
                id="service_state"
                placeholder="Select a state"
                options={opts(US_STATES)}
                value={query.service_state}
                onChange={(e) => set("service_state", e.target.value)}
              />
            </Field>

            <div className="mt-1 flex items-center gap-2">
              <Button type="submit" disabled={!complete || pending}>
                {pending ? "Checking…" : "Check eligibility"}
              </Button>
              {result && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setQuery(EMPTY);
                    setResult(null);
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="min-w-0">
        {result ? (
          <ResultCard result={result} />
        ) : (
          <Card className="flex h-full min-h-[280px] items-center justify-center border-dashed">
            <div className="max-w-xs px-6 text-center">
              <p className="font-display text-lg font-semibold text-ink">
                Check a patient&apos;s coverage
              </p>
              <p className="mt-1 text-sm text-muted">
                Enter the insurance details on the left to see whether Nabi can
                see this patient — and why.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkRegistryWithCandidate,
  previewRule,
  saveRule,
  type PreviewResult,
  type RegistryCheck,
} from "@/app/rules/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/Toggle";
import { useUser } from "@/components/user/UserProvider";
import type { RuleFields } from "@/lib/eligibility/types";
import { ConflictConfirmDialog } from "./ConflictConfirmDialog";
import { RegistryCheckBanner } from "./RegistryCheckBanner";
import { RuleFieldset } from "./RuleFieldset";
import { SummaryPanel } from "./RuleSummary";
import { EMPTY, nextStateSelection } from "./rule-helpers";

/**
 * The create-a-rule flow: a single-page form with an inline verify step. (The
 * edit flow for existing rules lives across the /rules/[id] view/edit/verify
 * routes instead.)
 */
export function RuleEditor({ prefill }: { prefill?: Partial<RuleFields> } = {}) {
  const router = useRouter();
  const { name } = useUser();
  const [tab, setTab] = useState<"form" | "json">("form");
  const [fields, setFields] = useState<RuleFields>({ ...EMPTY, ...prefill });
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState<RegistryCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Validate the registry as it would be once this new rule is saved.
  useEffect(() => {
    if (!preview?.ok) {
      setCheck(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    checkRegistryWithCandidate(preview.data).then((result) => {
      if (!cancelled) {
        setCheck(result);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [preview]);

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

  async function runPreview() {
    const p = payload();
    if (p === null) return;
    const result = await previewRule(p);
    setPreview(result);
    if (!result.ok) {
      setErrors(result.errors);
      if (result.formError) setJsonError(result.formError);
    } else {
      setErrors({});
    }
  }

  function onSaveClick() {
    // A failing registry check is non-blocking, but make the user confirm.
    if (check && check.failing > 0) setConfirmOpen(true);
    else doSave();
  }

  async function doSave() {
    if (!preview || !preview.ok) return;
    setConfirmOpen(false);
    setSaving(true);
    const result = await saveRule(preview.data, undefined, name);
    if (result.ok) {
      router.push(`/rules/${result.id}`);
      router.refresh();
    } else {
      setSaving(false);
      setErrors(result.errors);
      setPreview(null);
    }
  }

  /* ----------------------------- Verify step ------------------------------ */
  if (preview?.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <p className="type-subhead-2xs text-muted">Verify before saving</p>
            <h2 className="type-title-h6 text-ink">Review this rule</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-5">
            <SummaryPanel label="New rule" accent data={preview.data} />

            <RegistryCheckBanner check={check} loading={checking} />

            {preview.warnings.length > 0 && (
              <div className="rounded-xl bg-warning-bg px-4 py-3">
                {preview.warnings.map((w, i) => (
                  <p key={i} className="type-body-sm text-warning">
                    ⚠ {w.message}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={onSaveClick} disabled={saving}>
                {saving ? "Saving…" : "Confirm & save"}
              </Button>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Back to edit
              </Button>
            </div>
          </CardBody>
        </Card>

        <ConflictConfirmDialog
          open={confirmOpen}
          check={check}
          saving={saving}
          onClose={() => setConfirmOpen(false)}
          onConfirm={doSave}
        />
      </div>
    );
  }

  /* ------------------------------ Form step ------------------------------- */
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="type-title-h6 text-ink">New rule</h2>
          <SegmentedControl
            value={tab}
            onChange={switchTab}
            size="sm"
            options={[
              { value: "form", label: "Form" },
              { value: "json", label: "JSON" },
            ]}
          />
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <RuleFieldset
            fields={fields}
            setField={setField}
            setStates={setStates}
            errors={errors}
            tab={tab}
            jsonDraft={jsonDraft}
            setJsonDraft={setJsonDraft}
            jsonError={jsonError}
          />
          <div className="flex items-center gap-2 border-t border-line pt-4">
            <Button onClick={runPreview}>Preview &amp; verify</Button>
            <Button variant="ghost" onClick={() => router.push("/rules")}>
              Cancel
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

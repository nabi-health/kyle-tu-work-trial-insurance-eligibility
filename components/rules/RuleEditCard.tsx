"use client";

import { useRouter } from "next/navigation";
import { previewRule } from "@/app/rules/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/Toggle";
import { RuleFieldset } from "./RuleFieldset";
import { useRuleDraft } from "./RuleDraftProvider";

/** The edit form for a saved rule. Validates and advances to the verify route. */
export function RuleEditCard() {
  const router = useRouter();
  const d = useRuleDraft();

  async function onPreview() {
    const p = d.payload();
    if (p === null) return;
    const result = await previewRule(p, d.ruleId);
    d.setPreview(result);
    if (!result.ok) {
      d.setErrors(result.errors);
      if (result.formError) d.setJsonError(result.formError);
    } else {
      d.setErrors({});
      router.push(`/rules/${d.ruleId}/verify`);
    }
  }

  function onCancel() {
    d.reset();
    router.push(`/rules/${d.ruleId}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="type-title-h6 text-ink">Edit rule</h2>
          <SegmentedControl
            value={d.tab}
            onChange={d.switchTab}
            size="sm"
            options={[
              { value: "form", label: "Form" },
              { value: "json", label: "JSON" },
            ]}
          />
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <RuleFieldset
            fields={d.fields}
            setField={d.setField}
            setStates={d.setStates}
            errors={d.errors}
            tab={d.tab}
            jsonDraft={d.jsonDraft}
            setJsonDraft={d.setJsonDraft}
            jsonError={d.jsonError}
          />
          <div className="flex items-center gap-2 border-t border-line pt-4">
            <Button onClick={onPreview}>Preview &amp; verify</Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

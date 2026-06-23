import { RuleEditor } from "@/components/rules/RuleEditor";
import { BackLink, PageBody, PageHeader } from "@/components/ui/PageHeader";
import type { RuleFields } from "@/lib/eligibility/types";

/** Match-criteria fields the eligibility checker can hand off to prefill a rule. */
const PREFILL_KEYS = [
  "payer_group",
  "plan_type",
  "plan_structure",
  "service_state",
] as const;

export default async function NewRulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prefill: Partial<RuleFields> = {};
  for (const key of PREFILL_KEYS) {
    const value = params[key];
    if (typeof value === "string" && value.trim() !== "") prefill[key] = value;
  }
  const prefilled = Object.keys(prefill).length > 0;

  return (
    <>
      <PageHeader
        title="New Rule"
        subtitle={
          prefilled
            ? "Prefilled from an eligibility check that found no match. Set the outcomes, then preview before saving."
            : "Define who a rule applies to and what it asserts. You'll preview it before saving."
        }
        breadcrumbs={[
          { label: "Registry Rules", href: "/rules" },
          { label: "New rule" },
        ]}
      />
      <PageBody>
        <BackLink href="/rules" label="Registry Rules" />
        <RuleEditor prefill={prefilled ? prefill : undefined} />
      </PageBody>
    </>
  );
}

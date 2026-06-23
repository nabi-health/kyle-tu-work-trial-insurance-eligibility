import { notFound } from "next/navigation";
import { RuleEditor } from "@/components/rules/RuleEditor";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { getRule } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function EditRulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const rule = await getRule(id);
  if (!rule) notFound();

  return (
    <>
      <PageHeader
        title="Edit Rule"
        subtitle="Adjust the match criteria or outcomes. Preview the change before saving."
      />
      <PageBody className="max-w-3xl">
        {from === "check" && (
          <div className="mb-4 rounded-xl bg-info-bg px-4 py-3 text-sm text-info">
            You flagged an eligibility result as wrong. Fix the rule below — your
            change applies to every future check immediately.
          </div>
        )}
        <RuleEditor mode="edit" initial={rule} />
      </PageBody>
    </>
  );
}

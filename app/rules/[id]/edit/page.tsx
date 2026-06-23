import { notFound } from "next/navigation";
import { RuleEditCard } from "@/components/rules/RuleEditCard";
import { BackLink, PageBody, PageHeader } from "@/components/ui/PageHeader";
import { getRule } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function RuleEditPage({
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

  const name = rule.payer_group.trim() === "*" ? "Rule" : rule.payer_group;

  return (
    <>
      <PageHeader
        title="Edit rule"
        subtitle="Adjust the match criteria or outcomes. Preview the change before saving."
        breadcrumbs={[
          { label: "Registry Rules", href: "/rules" },
          { label: name, href: `/rules/${id}` },
          { label: "Edit" },
        ]}
      />
      <PageBody>
        <BackLink href={`/rules/${id}`} label="Rule details" />
        {from === "check" && (
          <div className="mx-auto mb-4 max-w-3xl rounded-xl bg-info-bg px-4 py-3 type-body-sm text-info">
            You flagged an eligibility result as wrong. Fix the rule below — your
            change applies to every future check immediately.
          </div>
        )}
        <RuleEditCard />
      </PageBody>
    </>
  );
}

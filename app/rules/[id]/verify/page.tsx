import { notFound } from "next/navigation";
import { RuleVerifyCard } from "@/components/rules/RuleVerifyCard";
import { BackLink, PageBody, PageHeader } from "@/components/ui/PageHeader";
import { getRule } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function RuleVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rule = await getRule(id);
  if (!rule) notFound();

  const name = rule.payer_group.trim() === "*" ? "Rule" : rule.payer_group;

  return (
    <>
      <PageHeader
        title="Review this rule"
        subtitle="Compare the saved rule with your changes, then confirm to save."
        breadcrumbs={[
          { label: "Registry Rules", href: "/rules" },
          { label: name, href: `/rules/${id}` },
          { label: "Edit", href: `/rules/${id}/edit` },
          { label: "Verify" },
        ]}
      />
      <PageBody>
        <BackLink href={`/rules/${id}/edit`} label="Edit" />
        <RuleVerifyCard />
      </PageBody>
    </>
  );
}

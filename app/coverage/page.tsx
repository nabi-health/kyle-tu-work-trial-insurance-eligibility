import { CoverageMatrix } from "@/components/coverage/CoverageMatrix";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { listPayerGroups, listRules } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const [rules, payerGroups] = await Promise.all([
    listRules(),
    listPayerGroups(),
  ]);

  return (
    <>
      <PageHeader
        title="Coverage Overview"
        subtitle="What Nabi can service at a glance, by payer and plan structure. Change the state or plan type to explore."
      />
      <PageBody>
        <CoverageMatrix rules={rules} payerGroups={payerGroups} />
      </PageBody>
    </>
  );
}

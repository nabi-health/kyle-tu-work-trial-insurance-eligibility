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
        subtitle="Every coverage rule and its outcomes. Opens with no filters (all data); narrow by state, plan type, or payer to explore."
      />
      <PageBody>
        <CoverageMatrix rules={rules} payerGroups={payerGroups} />
      </PageBody>
    </>
  );
}

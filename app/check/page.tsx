import { CheckerForm } from "@/components/check/CheckerForm";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { listPayerGroups } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function CheckPage() {
  const payerGroups = await listPayerGroups();

  return (
    <>
      <PageHeader
        title="Eligibility Check"
        subtitle="Enter a patient's insurance details to find out if Nabi can see them."
      />
      <PageBody>
        <CheckerForm payerGroups={payerGroups} />
      </PageBody>
    </>
  );
}

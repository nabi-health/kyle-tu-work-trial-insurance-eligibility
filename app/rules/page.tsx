import Link from "next/link";
import { RulesTable } from "@/components/rules/RulesTable";
import { Button } from "@/components/ui/Button";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { listRules } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await listRules();

  return (
    <>
      <PageHeader
        title="Registry Rules"
        subtitle="Every eligibility rule Nabi uses. Search, filter, and edit — changes apply to checks immediately."
        actions={
          <Link href="/rules/new">
            <Button>+ New rule</Button>
          </Link>
        }
      />
      <PageBody>
        <RulesTable rules={rules} />
      </PageBody>
    </>
  );
}

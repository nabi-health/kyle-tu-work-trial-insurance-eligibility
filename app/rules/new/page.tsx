import { RuleEditor } from "@/components/rules/RuleEditor";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";

export default function NewRulePage() {
  return (
    <>
      <PageHeader
        title="New Rule"
        subtitle="Define who a rule applies to and what it asserts. You'll preview it before saving."
      />
      <PageBody className="max-w-3xl">
        <RuleEditor mode="create" />
      </PageBody>
    </>
  );
}

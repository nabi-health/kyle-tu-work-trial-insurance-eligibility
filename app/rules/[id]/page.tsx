import { notFound } from "next/navigation";
import {
  RuleDetailCard,
  type RuleVersion,
} from "@/components/rules/RuleDetailCard";
import { ruleChanges } from "@/components/rules/rule-helpers";
import { BackLink, PageBody, PageHeader } from "@/components/ui/PageHeader";
import { getRule, listRuleHistory } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

const whenFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : whenFormatter.format(d);
};

export default async function RuleViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [rule, history] = await Promise.all([getRule(id), listRuleHistory(id)]);
  if (!rule) notFound();

  const name = rule.payer_group.trim() === "*" ? "Rule" : rule.payer_group;

  // Format dates and count changes server-side so the client component stays
  // presentational (and dates don't drift between server and client).
  const versions: RuleVersion[] = history.map((e) => ({
    id: e.id,
    action: e.action,
    actor: e.actor,
    when: formatWhen(e.created_at),
    before: e.before,
    after: e.after,
    changeCount: ruleChanges(e.before, e.after).length,
  }));

  return (
    <>
      <PageHeader
        title="Rule details"
        subtitle="Review the match criteria and outcomes. Click Edit to make changes."
        breadcrumbs={[
          { label: "Registry Rules", href: "/rules" },
          { label: name },
        ]}
      />
      <PageBody>
        <BackLink href="/rules" label="Registry Rules" />
        <RuleDetailCard rule={rule} versions={versions} />
      </PageBody>
    </>
  );
}

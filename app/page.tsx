import { DashboardCharacters } from "@/components/brand/DashboardCharacters";
import { DashboardChatHero } from "@/components/chat/DashboardChatHero";
import { Card } from "@/components/ui/Card";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { listRules } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const rules = await listRules();

  const payers = new Set<string>();
  const states = new Set<string>();
  let serviceable = 0;
  for (const r of rules) {
    if (r.payer_group.trim() && r.payer_group.trim() !== "*")
      payers.add(r.payer_group.trim());
    r.service_state
      .split(",")
      .forEach((s) => s.trim() && s.trim() !== "*" && states.add(s.trim()));
    if (r.serviceable.trim() === "Yes") serviceable++;
  }

  const stats = [
    { label: "Registry rules", value: rules.length },
    { label: "Payers", value: payers.size },
    { label: "States referenced", value: states.size },
    { label: "Serviceable rules", value: serviceable },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to the Nabi insurance registry. Check a patient, review coverage, or manage rules."
      />
      <PageBody className="flex flex-col gap-8">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="px-5 py-4">
              <p className="font-display text-3xl font-semibold text-primary">
                {s.value}
              </p>
              <p className="mt-1 type-body-sm text-muted">{s.label}</p>
            </Card>
          ))}
        </section>

        <DashboardChatHero />

        <DashboardCharacters />
      </PageBody>
    </>
  );
}

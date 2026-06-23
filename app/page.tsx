import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { listRules } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  {
    href: "/check",
    title: "Check eligibility",
    body: "Enter a patient's insurance details and get a clear answer.",
  },
  {
    href: "/coverage",
    title: "Coverage overview",
    body: "See what Nabi services by payer, plan structure, and state.",
  },
  {
    href: "/rules",
    title: "Manage rules",
    body: "Search, create, edit, and correct the registry rules.",
  },
];

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
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </Card>
          ))}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Jump in
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((q) => (
              <Link key={q.href} href={q.href} className="group">
                <Card className="h-full px-5 py-5 transition-colors hover:border-secondary hover:bg-cream">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-base font-semibold text-ink">
                      {q.title}
                    </p>
                    <span className="text-primary transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted">{q.body}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </PageBody>
    </>
  );
}

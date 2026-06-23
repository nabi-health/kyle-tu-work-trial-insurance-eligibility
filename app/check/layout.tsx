import { PageBody, PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

/**
 * Shared chrome for the Eligibility section. The Check / Bulk sandbox / Test
 * subtabs live in the sidebar (expandable group); each subtab route renders
 * only its body here.
 */
export default function EligibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="Eligibility"
        subtitle="Check one patient, run a bulk sandbox, or manage the saved test cases."
      />
      <PageBody>{children}</PageBody>
    </>
  );
}

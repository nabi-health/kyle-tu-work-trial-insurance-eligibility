import { notFound } from "next/navigation";
import { RuleDraftProvider } from "@/components/rules/RuleDraftProvider";
import { getRule } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

/**
 * Wraps the view / edit / verify routes for a single rule in a shared draft
 * provider. Next keeps this layout mounted while navigating between its child
 * routes, so an unsaved edit survives the move from /edit to /verify.
 */
export default async function RuleLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const rule = await getRule(id);
  if (!rule) notFound();

  return <RuleDraftProvider rule={rule}>{children}</RuleDraftProvider>;
}

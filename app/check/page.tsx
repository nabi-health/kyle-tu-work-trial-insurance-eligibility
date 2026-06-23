import { CheckerForm } from "@/components/check/CheckerForm";
import { listPayerGroups } from "@/lib/rules/repository";

export default async function CheckPage() {
  const payerGroups = await listPayerGroups();
  return <CheckerForm payerGroups={payerGroups} />;
}

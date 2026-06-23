import { AssistantWorkspace } from "@/components/chat/AssistantWorkspace";
import { listRules } from "@/lib/rules/repository";

export const dynamic = "force-dynamic";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [rules, params] = await Promise.all([listRules(), searchParams]);
  const q = typeof params.q === "string" ? params.q : undefined;

  return (
    <div className="flex h-screen flex-col px-8 sm:px-12 lg:px-20">
      <AssistantWorkspace rules={rules} initialPrompt={q} />
    </div>
  );
}

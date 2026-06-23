import { TestsWorkspace } from "@/components/tests/TestsWorkspace";
import { listPayerGroups, listRules } from "@/lib/rules/repository";
import { listTests } from "@/lib/tests/repository";
import { runTests, summarize } from "@/lib/tests/runner";

export default async function TestsPage() {
  const [tests, rules, payerGroups] = await Promise.all([
    listTests(),
    listRules(),
    listPayerGroups(),
  ]);

  // Run every test against the live registry on the server, so the tab loads
  // with current pass/fail status already computed.
  const runs = runTests(tests, rules);
  const summary = summarize(runs);

  return (
    <TestsWorkspace runs={runs} summary={summary} payerGroups={payerGroups} />
  );
}

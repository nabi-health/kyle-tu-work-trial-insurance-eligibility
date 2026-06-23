"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRuleAction } from "@/app/rules/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Field";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import type { OutcomeKey, Rule } from "@/lib/eligibility/types";

type SortKey = "payer_group" | "plan_type" | "plan_structure" | "service_state";

const display = (v: string) => (v.trim() === "*" || v === "" ? "Any" : v);
const opt = (v: string) => ({ value: v, label: v });

type SortState = { key: SortKey; dir: 1 | -1 };

function SortHeader({
  k,
  label,
  sort,
  onSort,
}: {
  k: SortKey;
  label: string;
  sort: SortState;
  onSort: (k: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(k)}
      className="flex items-center gap-1 font-medium text-muted hover:text-ink"
    >
      {label}
      {sort.key === k && (
        <span className="text-[10px]">{sort.dir === 1 ? "▲" : "▼"}</span>
      )}
    </button>
  );
}

export function RulesTable({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [payer, setPayer] = useState("");
  const [state, setState] = useState("");
  const [planType, setPlanType] = useState("");
  const [structure, setStructure] = useState("");
  const [sort, setSort] = useState<SortState>({
    key: "payer_group",
    dir: 1,
  });
  const [target, setTarget] = useState<Rule | null>(null);
  const [pending, startTransition] = useTransition();

  const { payerOpts, stateOpts, typeOpts, structureOpts } = useMemo(() => {
    const payers = new Set<string>();
    const states = new Set<string>();
    const types = new Set<string>();
    const structures = new Set<string>();
    for (const r of rules) {
      if (r.payer_group.trim()) payers.add(r.payer_group.trim());
      r.service_state.split(",").forEach((s) => s.trim() && states.add(s.trim()));
      if (r.plan_type.trim()) types.add(r.plan_type.trim());
      if (r.plan_structure.trim()) structures.add(r.plan_structure.trim());
    }
    const sorted = (s: Set<string>) =>
      [...s].sort((a, b) => a.localeCompare(b)).map(opt);
    return {
      payerOpts: sorted(payers),
      stateOpts: sorted(states),
      typeOpts: sorted(types),
      structureOpts: sorted(structures),
    };
  }, [rules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rules.filter((r) => {
      if (payer && r.payer_group.trim() !== payer) return false;
      if (planType && r.plan_type.trim() !== planType) return false;
      if (structure && r.plan_structure.trim() !== structure) return false;
      if (state) {
        const states = r.service_state.split(",").map((s) => s.trim());
        if (r.service_state.trim() !== "*" && !states.includes(state))
          return false;
      }
      if (q) {
        const hay = [
          r.payer_group,
          r.payer_id,
          r.plan_type,
          r.plan_structure,
          r.service_state,
          r.notes,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...out].sort(
      (a, b) => a[sort.key].localeCompare(b[sort.key]) * sort.dir,
    );
  }, [rules, search, payer, state, planType, structure, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  function clearFilters() {
    setSearch("");
    setPayer("");
    setState("");
    setPlanType("");
    setStructure("");
  }

  function confirmDelete() {
    if (!target) return;
    const id = target.id;
    startTransition(async () => {
      await deleteRuleAction(id);
      setTarget(null);
      router.refresh();
    });
  }

  const hasFilters = search || payer || state || planType || structure;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Search payer, ID, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select placeholder="Payer" options={payerOpts} value={payer}
            onChange={(e) => setPayer(e.target.value)} />
        </div>
        <div className="w-32">
          <Select placeholder="State" options={stateOpts} value={state}
            onChange={(e) => setState(e.target.value)} />
        </div>
        <div className="w-40">
          <Select placeholder="Plan type" options={typeOpts} value={planType}
            onChange={(e) => setPlanType(e.target.value)} />
        </div>
        <div className="w-36">
          <Select placeholder="Structure" options={structureOpts} value={structure}
            onChange={(e) => setStructure(e.target.value)} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-subtle">
        {filtered.length} of {rules.length} rules
      </p>

      {/* Table */}
      <div className="scroll-area overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/50 text-left text-xs">
              <th className="px-4 py-3"><SortHeader k="payer_group" label="Payer" sort={sort} onSort={toggleSort} /></th>
              <th className="px-4 py-3"><SortHeader k="plan_type" label="Type" sort={sort} onSort={toggleSort} /></th>
              <th className="px-4 py-3"><SortHeader k="plan_structure" label="Structure" sort={sort} onSort={toggleSort} /></th>
              <th className="px-4 py-3"><SortHeader k="service_state" label="State" sort={sort} onSort={toggleSort} /></th>
              {OUTCOME_KEYS.map((k) => (
                <th key={k} className="px-4 py-3 font-medium text-muted">
                  {OUTCOME_LABELS[k]}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/rules/${r.id}`)}
                className="group cursor-pointer border-b border-line last:border-0 hover:bg-filler/20"
              >
                <td className="px-4 py-3 font-medium text-ink">
                  {display(r.payer_group)}
                  {r.payer_id.trim() !== "*" && r.payer_id.trim() !== "" && (
                    <span className="block text-xs font-normal text-subtle">
                      {r.payer_id}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{display(r.plan_type)}</td>
                <td className="px-4 py-3 text-muted">{display(r.plan_structure)}</td>
                <td className="max-w-[160px] truncate px-4 py-3 text-muted" title={r.service_state}>
                  {display(r.service_state)}
                </td>
                {OUTCOME_KEYS.map((k) => (
                  <td key={k} className="px-4 py-3">
                    <Badge tone={outcomeTone(k as OutcomeKey, r[k])}>{display(r[k])}</Badge>
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link
                      href={`/rules/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg px-2 py-1 text-[13px] font-medium text-primary hover:bg-filler/40"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTarget(r);
                      }}
                      className="rounded-lg px-2 py-1 text-[13px] font-medium text-danger hover:bg-danger-bg"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-subtle">
                  No rules match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Delete this rule?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete rule"}
            </Button>
          </>
        }
      >
        {target && (
          <p>
            This permanently removes the rule for{" "}
            <span className="font-medium text-ink">{display(target.payer_group)}</span>{" "}
            ({display(target.plan_type)} · {display(target.plan_structure)} ·{" "}
            {display(target.service_state)}). Future eligibility checks will no
            longer use it.
          </p>
        )}
      </Dialog>
    </div>
  );
}

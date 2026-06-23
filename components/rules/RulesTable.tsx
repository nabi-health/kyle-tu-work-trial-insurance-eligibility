"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRuleAction } from "@/app/rules/actions";
import { RuleValidationDialog } from "@/components/rules/RuleValidationDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Field";
import { MatrixTable, type MatrixColumn } from "@/components/ui/MatrixTable";
import { OUTCOME_KEYS, OUTCOME_LABELS } from "@/lib/eligibility/constants";
import { outcomeTone } from "@/lib/eligibility/presentation";
import type { OutcomeKey, Rule } from "@/lib/eligibility/types";

const display = (v: string) => (v.trim() === "*" || v === "" ? "Any" : v);
const opt = (v: string) => ({ value: v, label: v });

export function RulesTable({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [payer, setPayer] = useState("");
  const [state, setState] = useState("");
  const [planType, setPlanType] = useState("");
  const [structure, setStructure] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
        const hay = Object.entries(r)
          .filter(([k]) => k !== "id")
          .map(([, v]) => v)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return out;
  }, [rules, search, payer, state, planType, structure]);

  function clearFilters() {
    setSearch("");
    setPayer("");
    setState("");
    setPlanType("");
    setStructure("");
  }

  const selectedRules = useMemo(
    () => rules.filter((r) => selected.has(r.id)),
    [rules, selected],
  );

  function toggleRow(rule: Rule) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rule.id)) next.delete(rule.id);
      else next.add(rule.id);
      return next;
    });
  }

  function toggleAll(visible: Rule[]) {
    setSelected((prev) => {
      const allSelected = visible.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allSelected) visible.forEach((r) => next.delete(r.id));
      else visible.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function editSelected() {
    const [only] = [...selected];
    if (only) router.push(`/rules/${only}`);
  }

  function confirmDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      await Promise.all(ids.map((id) => deleteRuleAction(id)));
      setSelected(new Set());
      setConfirmingDelete(false);
      router.refresh();
    });
  }

  const hasFilters = search || payer || state || planType || structure;
  const selectedCount = selected.size;

  const columns = useMemo<MatrixColumn<Rule>[]>(
    () => [
      {
        key: "payer_group",
        header: "Payer",
        align: "left",
        sortValue: (r) => r.payer_group.trim().toLowerCase(),
        cell: (r) => (
          <>
            {display(r.payer_group)}
            {r.payer_id.trim() !== "*" && r.payer_id.trim() !== "" && (
              <span className="block type-body-xs text-subtle">{r.payer_id}</span>
            )}
          </>
        ),
      },
      {
        key: "plan_type",
        header: "Type",
        align: "left",
        sortValue: (r) => r.plan_type.trim().toLowerCase(),
        cell: (r) => <span className="text-muted">{display(r.plan_type)}</span>,
      },
      {
        key: "plan_structure",
        header: "Structure",
        align: "left",
        sortValue: (r) => r.plan_structure.trim().toLowerCase(),
        cell: (r) => <span className="text-muted">{display(r.plan_structure)}</span>,
      },
      {
        key: "service_state",
        header: "State",
        align: "left",
        width: 150,
        clip: true,
        sortValue: (r) => r.service_state.trim().toLowerCase(),
        cell: (r) => (
          <span className="text-muted" title={r.service_state}>
            {display(r.service_state)}
          </span>
        ),
      },
      ...OUTCOME_KEYS.map<MatrixColumn<Rule>>((k) => ({
        key: k,
        header: OUTCOME_LABELS[k],
        align: "left",
        width: 200,
        sortValue: (r) => display(r[k]).toLowerCase(),
        cell: (r) => (
          <Badge tone={outcomeTone(k as OutcomeKey, r[k])}>{display(r[k])}</Badge>
        ),
      })),
      {
        key: "notes",
        header: "Notes",
        align: "left",
        width: 200,
        clip: true,
        sortValue: (r) => r.notes.trim().toLowerCase(),
        cell: (r) =>
          r.notes.trim() ? (
            <span className="text-muted" title={r.notes}>
              {r.notes}
            </span>
          ) : (
            <span className="text-subtle/60">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <Input
            size="sm"
            placeholder="Search all fields…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Dropdown size="sm" placeholder="Payer" options={payerOpts} value={payer}
            onChange={setPayer} />
        </div>
        <div className="w-32">
          <Dropdown size="sm" placeholder="State" options={stateOpts} value={state}
            onChange={setState} />
        </div>
        <div className="w-40">
          <Dropdown size="sm" placeholder="Plan type" options={typeOpts} value={planType}
            onChange={setPlanType} />
        </div>
        <div className="w-36">
          <Dropdown size="sm" placeholder="Structure" options={structureOpts} value={structure}
            onChange={setStructure} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Toolbar: row count, or actions for the current selection */}
      <div className="flex min-h-8 items-center justify-between gap-3">
        {selectedCount > 0 ? (
          <>
            <p className="type-label-sm text-ink">
              {selectedCount} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={editSelected}
                disabled={selectedCount !== 1}
                title={
                  selectedCount === 1
                    ? "Edit the selected rule"
                    : "Select a single rule to edit"
                }
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="type-body-xs text-subtle">
              {filtered.length} of {rules.length} rules
            </p>
            <div className="flex items-center gap-2">
              <RuleValidationDialog />
              <Link href="/rules/new">
                <Button size="sm">+ New rule</Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <MatrixTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/rules/${r.id}`)}
        defaultSort={{ key: "payer_group", dir: "asc" }}
        emptyMessage="No rules match these filters."
        // Fill the space left under the header/filters/toolbar so the table
        // scrolls internally and the page itself never overflows the viewport.
        maxHeight="calc(100vh - 16rem)"
        selectedKeys={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
      />

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={
          selectedCount === 1 ? "Delete this rule?" : `Delete ${selectedCount} rules?`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={pending}>
              {pending
                ? "Deleting…"
                : selectedCount === 1
                  ? "Delete rule"
                  : `Delete ${selectedCount} rules`}
            </Button>
          </>
        }
      >
        {selectedCount === 1 ? (
          <p>
            This permanently removes the rule for{" "}
            <span className="font-medium text-ink">
              {display(selectedRules[0].payer_group)}
            </span>{" "}
            ({display(selectedRules[0].plan_type)} ·{" "}
            {display(selectedRules[0].plan_structure)} ·{" "}
            {display(selectedRules[0].service_state)}). Future eligibility checks
            will no longer use it.
          </p>
        ) : (
          <p>
            This permanently removes{" "}
            <span className="font-medium text-ink">{selectedCount} rules</span>.
            Future eligibility checks will no longer use them.
          </p>
        )}
      </Dialog>
    </div>
  );
}

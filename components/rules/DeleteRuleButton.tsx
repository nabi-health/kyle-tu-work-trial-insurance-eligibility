"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRuleAction } from "@/app/rules/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Rule } from "@/lib/eligibility/types";
import { display } from "./rule-helpers";

/** Delete a rule from its detail page, behind a confirmation modal. */
export function DeleteRuleButton({ rule }: { rule: Rule }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      await deleteRuleAction(rule.id);
      router.push("/rules");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-danger hover:bg-danger/10 hover:text-danger"
      >
        <TrashIcon />
        Delete
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this rule?"
        character="emi"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete rule"}
            </Button>
          </>
        }
      >
        <p className="text-ink">
          This permanently removes the rule for{" "}
          <span className="font-medium">{display(rule.payer_group)}</span> (
          {display(rule.plan_type)} · {display(rule.plan_structure)} ·{" "}
          {display(rule.service_state)}).
        </p>
        <p className="mt-2">
          Eligibility checks that relied on it will change immediately, and this
          can&apos;t be undone.
        </p>
      </Dialog>
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

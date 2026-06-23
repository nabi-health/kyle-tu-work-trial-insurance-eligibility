"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useUser } from "@/components/user/UserProvider";

/** Lightweight settings form — set the name attributed to your rule changes. */
export function UserSettings() {
  const { name, setName, ready } = useUser();
  const [draft, setDraft] = useState(name);
  const [saved, setSaved] = useState(false);

  // Sync the field once localStorage has loaded the stored name.
  useEffect(() => {
    setDraft(name);
  }, [name]);

  const dirty = draft.trim() !== name && draft.trim() !== "";

  function save() {
    setName(draft);
    setSaved(true);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <h2 className="type-title-h6 text-ink">Your identity</h2>
          <p className="mt-1 type-body-sm text-muted">
            Recorded as the author on every rule change you save. Stored only in
            this browser — there's no account or sign-in.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <Field label="Your name" htmlFor="user-name">
            <Input
              id="user-name"
              value={draft}
              placeholder="e.g. Nikki M"
              disabled={!ready}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaved(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && dirty) save();
              }}
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={!dirty}>
              Save
            </Button>
            {saved && !dirty && (
              <span className="type-body-sm text-success">Saved ✓</span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { USER_STATUS_OPTIONS } from "./options";

/** Search by name or email (at least 2 characters). Staff data, not patient data, so it lives in the URL. */
export function UserFilters({ q, status }: { q: string; status: string }) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(q);

  function go(next: Partial<{ q: string; status: string }>) {
    const params = new URLSearchParams();
    const nextQ = (next.q ?? text).trim();
    const nextStatus = next.status ?? status;
    if (nextQ) params.set("q", nextQ);
    if (nextStatus) params.set("status", nextStatus);
    progress.start();
    startTransition(() => router.push(`/admin/users${params.size > 0 ? `?${params.toString()}` : ""}`));
  }

  return (
    <div aria-busy={pending || undefined} className={clsx("mb-6 grid grid-cols-1 items-end gap-5 border border-ink bg-surface p-6 transition-opacity md:grid-cols-12", pending && "opacity-60")}>
      <div className="md:col-span-5">
        <TextField
          label="Name or email"
          autoComplete="off"
          maxLength={100}
          value={text}
          hint="At least 2 characters."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              go({});
            }
          }}
        />
      </div>
      <div className="md:col-span-3">
        <SelectField label="Status" options={USER_STATUS_OPTIONS} value={status} onChange={(value) => go({ status: value })} allowEmpty emptyLabel="All" placeholder="All" />
      </div>
      <div className="flex gap-3 md:col-span-4">
        <Button variant="secondary" className="flex-1" onClick={() => go({})}>Search</Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={!q && !status}
          onClick={() => {
            setText("");
            go({ q: "", status: "" });
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

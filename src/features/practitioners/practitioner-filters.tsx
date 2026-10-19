"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { PRACTITIONER_STATUS_OPTIONS, PRACTITIONER_TYPE_OPTIONS } from "./options";

type Props = { q: string; type: string; status: string };

/** Filters live in the URL. A practitioner's name is staff data, not patient data. */
export function PractitionerFilters({ q, type, status }: Props) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(q);

  function go(next: Partial<Props>) {
    const params = new URLSearchParams();
    const nextQ = (next.q ?? text).trim();
    const nextType = next.type ?? type;
    const nextStatus = next.status ?? status;
    if (nextQ) params.set("q", nextQ);
    if (nextType) params.set("type", nextType);
    if (nextStatus) params.set("status", nextStatus);
    progress.start();
    startTransition(() => router.push(`/admin/practitioners${params.size > 0 ? `?${params.toString()}` : ""}`));
  }

  return (
    <div aria-busy={pending || undefined} className={clsx("mb-6 grid grid-cols-1 items-end gap-5 border border-ink bg-surface p-6 transition-opacity md:grid-cols-12", pending && "opacity-60")}>
      <div className="md:col-span-4">
        <TextField
          label="Name"
          autoComplete="off"
          maxLength={100}
          value={text}
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
        <SelectField label="Type" options={PRACTITIONER_TYPE_OPTIONS} value={type} onChange={(value) => go({ type: value })} allowEmpty emptyLabel="All types" placeholder="All types" />
      </div>
      <div className="md:col-span-3">
        <SelectField label="Status" options={PRACTITIONER_STATUS_OPTIONS} value={status} onChange={(value) => go({ status: value })} allowEmpty emptyLabel="All" placeholder="All" />
      </div>
      <div className="md:col-span-2">
        <Button variant="secondary" className="w-full" onClick={() => go({})}>Search</Button>
      </div>
    </div>
  );
}
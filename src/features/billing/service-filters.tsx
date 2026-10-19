"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { ACTIVE_OPTIONS, SERVICE_CATEGORY_OPTIONS } from "./options";

type Props = { q: string; category: string; active: string };

/** Filters live in the URL: a service name or code is not patient data. */
export function ServiceFilters({ q, category, active }: Props) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(q);

  function go(next: Partial<Props>) {
    const params = new URLSearchParams();
    const nextQ = (next.q ?? text).trim();
    const nextCategory = next.category ?? category;
    const nextActive = next.active ?? active;
    if (nextQ) params.set("q", nextQ);
    if (nextCategory) params.set("category", nextCategory);
    if (nextActive) params.set("active", nextActive);
    progress.start();
    startTransition(() => router.push(`/billing/services${params.size > 0 ? `?${params.toString()}` : ""}`));
  }

  return (
    <div
      aria-busy={pending || undefined}
      className={clsx("mb-6 grid grid-cols-1 items-end gap-5 border border-ink bg-surface p-6 transition-opacity md:grid-cols-12", pending && "opacity-60")}
    >
      <div className="md:col-span-4">
        <TextField
          label="Name or code"
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
        <SelectField label="Category" options={SERVICE_CATEGORY_OPTIONS} value={category} onChange={(value) => go({ category: value })} allowEmpty emptyLabel="All categories" placeholder="All categories" />
      </div>
      <div className="md:col-span-3">
        <SelectField label="Status" options={ACTIVE_OPTIONS} value={active} onChange={(value) => go({ active: value })} allowEmpty emptyLabel="All" placeholder="All" />
      </div>
      <div className="md:col-span-2">
        <Button variant="secondary" className="w-full" onClick={() => go({})}>Search</Button>
      </div>
    </div>
  );
}
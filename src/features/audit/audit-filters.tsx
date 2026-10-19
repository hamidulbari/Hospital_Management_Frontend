"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField, type Option } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { parseIso } from "@/lib/calendar";

type Values = { action: string; actor: string; resource_type: string; resource_id: string; outcome: string; correlation_id: string; from: string; to: string };

const OUTCOME_OPTIONS: Option[] = [
  { value: "success", label: "Success" },
  { value: "denied", label: "Denied" },
  { value: "error", label: "Error" },
];

const EMPTY: Values = { action: "", actor: "", resource_type: "", resource_id: "", outcome: "", correlation_id: "", from: "", to: "" };

export function AuditFilters({ initial, users }: { initial: Values; users: Option[] }) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<Values>(initial);

  const set = (key: keyof Values, value: string) => setV((current) => ({ ...current, [key]: value }));

  function go(values: Values) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      const text = value.trim();
      if (!text) continue;
      if ((key === "from" || key === "to") && !parseIso(text)) continue;
      params.set(key, text);
    }
    progress.start();
    startTransition(() => router.push(`/admin/audit${params.size > 0 ? `?${params.toString()}` : ""}`));
  }

  return (
    <div aria-busy={pending || undefined} className={clsx("mb-6 border border-ink bg-surface p-6 transition-opacity", pending && "opacity-60")}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="md:col-span-4">
          <TextField label="Action" autoComplete="off" maxLength={80} value={v.action} onChange={(e) => set("action", e.target.value)} hint="For example patient.viewed" />
        </div>
        <div className="md:col-span-4">
          <TextField label="Resource type" autoComplete="off" maxLength={60} value={v.resource_type} onChange={(e) => set("resource_type", e.target.value)} />
        </div>
        <div className="md:col-span-4">
          <TextField label="Resource id" autoComplete="off" maxLength={64} value={v.resource_id} onChange={(e) => set("resource_id", e.target.value)} />
        </div>
        {users.length > 0 ? (
          <div className="md:col-span-4">
            <SelectField label="Who" options={users} value={v.actor} onChange={(value) => set("actor", value)} allowEmpty emptyLabel="Anyone" placeholder="Anyone" />
          </div>
        ) : null}
        <div className="md:col-span-2">
          <SelectField label="Outcome" options={OUTCOME_OPTIONS} value={v.outcome} onChange={(value) => set("outcome", value)} allowEmpty emptyLabel="Any" placeholder="Any" />
        </div>
        <div className="md:col-span-3">
          <DateField label="From" value={v.from} onChange={(value) => set("from", value)} disableFuture minYear={2020} />
        </div>
        <div className="md:col-span-3">
          <DateField label="To" value={v.to} onChange={(value) => set("to", value)} disableFuture minYear={2020} />
        </div>
        <div className="md:col-span-4">
          <TextField label="Reference (correlation id)" autoComplete="off" maxLength={26} value={v.correlation_id} onChange={(e) => set("correlation_id", e.target.value)} hint="Shown in an error message." />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => go(v)}>Search</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setV(EMPTY);
            go(EMPTY);
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
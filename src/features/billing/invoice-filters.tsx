"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField } from "@/components/ui/select-field";
import { parseIso } from "@/lib/calendar";
import { INVOICE_STATUS_OPTIONS } from "./options";

/** The day is optional (empty = newest invoices). Neither value is patient data, so both live in the URL. */
export function InvoiceFilters({ date, status }: { date: string; status: string }) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();

  function go(next: Partial<{ date: string; status: string }>) {
    const params = new URLSearchParams();
    const nextDate = next.date ?? date;
    const nextStatus = next.status ?? status;
    if (nextDate) params.set("date", nextDate);
    if (nextStatus) params.set("status", nextStatus);
    progress.start();
    startTransition(() => router.push(`/billing${params.size > 0 ? `?${params.toString()}` : ""}`));
  }

  return (
    <div
      aria-busy={pending || undefined}
      className={clsx("mb-6 grid grid-cols-1   gap-5 border border-ink bg-surface p-6 transition-opacity md:grid-cols-12", pending && "opacity-60")}
    >
      <div className="md:col-span-4">
         <DateField
          key={date}
          label="Created on"
          value={date}
          onChange={(value) => {
            if (value === "") {
              if (date) go({ date: "" });
            } else if (parseIso(value) && value !== date) {
              go({ date: value });
            }
          }}
          minYear={2020}
          hint="Leave empty for the newest invoices."
        />
      </div>
      <div className="md:col-span-4">
        <SelectField label="Status" options={INVOICE_STATUS_OPTIONS} value={status} onChange={(value) => go({ status: value })} allowEmpty emptyLabel="All statuses" placeholder="All statuses" />
      </div>
      <div className="md:col-span-2 flex items-center ">
        <Button variant="secondary" className="w-full" disabled={!date && !status} onClick={() => go({ date: "", status: "" })}>
          Clear
        </Button>
      </div>
    </div>
  );
}

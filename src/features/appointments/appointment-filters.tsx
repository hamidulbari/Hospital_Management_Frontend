"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField, type Option } from "@/components/ui/select-field";
import { parseIso } from "@/lib/calendar";

type Props = {
  basePath: string;
  today: string;
  date: string;
  practitioner: string;
  status: string;
  practitioners?: Option[];
  statusOptions: Option[];
};

/** Filters live in the URL (date, doctor id, status). None of them is patient data. */
export function AppointmentFilters({ basePath, today, date, practitioner, status, practitioners, statusOptions }: Props) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();

  function go(next: Partial<{ date: string; practitioner: string; status: string }>) {
    const params = new URLSearchParams();
    const nextDate = next.date ?? date;
    const nextPractitioner = next.practitioner ?? practitioner;
    const nextStatus = next.status ?? status;
    params.set("date", nextDate);
    if (nextPractitioner && practitioners) params.set("practitioner", nextPractitioner);
    if (nextStatus) params.set("status", nextStatus);
    progress.start();
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
  }

  return (
    <div
      aria-busy={pending || undefined}
      className={clsx(
        "mb-6 grid grid-cols-1 items-end gap-5 border border-ink bg-surface p-6 transition-opacity md:grid-cols-12",
        pending && "opacity-60",
      )}
    >
      <div className="md:col-span-3">
        <DateField
          key={date}
          label="Date"
          value={date}
          onChange={(value) => {
            if (parseIso(value) && value !== date) go({ date: value });
          }}
          disableFuture={false}
          minYear={2020}
        />
      </div>
      {practitioners ? (
        <div className="md:col-span-4">
          <SelectField
            label="Doctor"
            options={practitioners}
            value={practitioner}
            onChange={(value) => go({ practitioner: value })}
            allowEmpty
            emptyLabel="All doctors"
            placeholder="All doctors"
          />
        </div>
      ) : null}
      <div className="md:col-span-3">
        <SelectField
          label="Status"
          options={statusOptions}
          value={status}
          onChange={(value) => go({ status: value })}
          allowEmpty
          emptyLabel="All statuses"
          placeholder="All statuses"
        />
      </div>
      <div className="md:col-span-2">
        <Button variant="secondary" className="w-full" disabled={date === today} onClick={() => go({ date: today })}>
          Today
        </Button>
      </div>
    </div>
  );
}
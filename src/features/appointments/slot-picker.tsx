"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { DateField } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice } from "@/components/ui/notice";
import { SelectField } from "@/components/ui/select-field";
import type { ClientError } from "@/lib/api/errors";
import { addDays, parseIso, weekdayName } from "@/lib/calendar";
import { formatLocalDate, formatLocalTime } from "@/lib/datetime";
import { loadSlotsAction } from "./actions";
import { SLOT_RANGE_OPTIONS } from "./options";
import type { SlotDay } from "./parse";

export type PickedSlot = { date: string; time: string };

type Props = {
  practitionerId: string;
  timezone: string | null;
  today: string;
  value: PickedSlot | null;
  onChange: (slot: PickedSlot | null) => void;
  /** Change this number to reload the slots (after "slot_unavailable"). */
  reloadKey?: number;
  /** A walk-in: today only, and the slot that is running now is listed too. */
  lockToToday?: boolean;
};

type Loaded = { key: string; days: SlotDay[]; error: ClientError | null };

export function SlotPicker({ practitionerId, timezone, today, value, onChange, reloadKey = 0, lockToToday = false }: Props) {
  const [from, setFrom] = useState(today);
  const [range, setRange] = useState("7");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requestId = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const fromDate = lockToToday ? today : from;
  const validFrom = parseIso(fromDate) !== null;
  const toDate = lockToToday || !validFrom ? fromDate : addDays(fromDate, Number(range) - 1);
  const ready = Boolean(practitionerId) && validFrom;
  const key = `${practitionerId}|${fromDate}|${toDate}|${reloadKey}`;
  const loading = ready && loaded?.key !== key;

  useEffect(() => {
    if (!ready) return;
    const id = ++requestId.current;
    loadSlotsAction({ practitioner_id: practitionerId, from: fromDate, to: toDate, timezone, include_running: lockToToday }).then((response) => {
      if (id !== requestId.current) return; // an older request, ignore
      if (response.ok) {
        setLoaded({ key, days: response.data, error: null });
        const current = valueRef.current;
        if (current && !response.data.some((day) => day.date === current.date && day.times.includes(current.time))) {
          onChangeRef.current(null);
        }
        return;
      }
      if (response.error.code === "unauthenticated") {
        window.location.assign("/api/auth/session-expired");
        return;
      }
      setLoaded({ key, days: [], error: response.error });
    });
  }, [ready, practitionerId, fromDate, toDate, timezone, key, lockToToday]);

  const current = loaded?.key === key ? loaded : null;

  return (
    <div className="flex flex-col gap-4">
      {lockToToday ? (
        <p className="text-sm text-ink">Today, {formatLocalDate(today)}</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-5">
            <DateField label="From date" value={from} onChange={setFrom} disableFuture={false} minYear={Number(today.slice(0, 4))} />
          </div>
          <div className="md:col-span-3">
            <SelectField label="Show" options={SLOT_RANGE_OPTIONS} value={range} onChange={setRange} />
          </div>
        </div>
      )}
      {validFrom && fromDate < today ? <p className="text-xs text-muted">That date has passed. Choose today or a later date.</p> : null}

      {!practitionerId ? (
        <p className="text-sm text-muted">Choose a doctor to see free slots.</p>
      ) : !validFrom ? (
        <p className="text-sm text-muted">Enter a valid date.</p>
      ) : loading ? (
        <p role="status" className="text-sm text-muted">Loading slots&hellip;</p>
      ) : current?.error ? (
        <ErrorNotice error={current.error} />
      ) : current && current.days.length === 0 ? (
        <EmptyState title="No free slots" description="This doctor has no free slot in this range. Try other dates, or check the doctor's working hours in Administration." />
      ) : (
        <div className="flex flex-col gap-3">
          {current?.days.map((day) => (
            <div key={day.date} className="border border-ink bg-surface p-4">
              <p className="font-headline text-xs font-bold uppercase tracking-wider text-ink">
                {weekdayName(day.date)}, {formatLocalDate(day.date)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {day.times.map((time) => {
                  const selected = value?.date === day.date && value.time === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ date: day.date, time })}
                      className={clsx(
                        "h-9 min-w-16 border px-3 text-sm font-semibold",
                        selected ? "border-section bg-section text-white" : "border-ink bg-surface text-ink hover:border-section hover:bg-section-soft",
                      )}
                    >
                      {formatLocalTime(time)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

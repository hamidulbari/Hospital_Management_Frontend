"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { ReadOnlyField } from "@/components/ui/read-only-field";
import { TextField } from "@/components/ui/text-field";
import { TimeField } from "@/components/ui/time-field";
import { useToast } from "@/components/ui/toast-provider";
import { fieldErrorsFromZod } from "@/lib/api/invalid";
import { formatLocalDate } from "@/lib/datetime";
import { redirectIfExpired } from "@/lib/session-expired";
import { exactCounts, formatDuration, nearest, slotLengthFor, slotsIn, windowMinutes } from "@/lib/slot-math";
import { format12h } from "@/lib/time-input";
import { addRulesAction, deleteRuleAction } from "./actions";
import { WEEKDAY_OPTIONS, weekdayLabel } from "./options";
import type { RuleItem } from "./parse";
import { rulesSchema } from "./schemas";

type Props = { practitionerId: string; rules: RuleItem[]; canManage: boolean };

const MIN_SLOT = 5; // the server's limits for one slot
const MAX_SLOT = 240;
const START_SLOT = 15; // only to fill the form at the start

export function RulesPanel({ practitionerId, rules, canManage }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  // The slot length is never typed: it is worked out from From, To and the number of appointments.
  // At the start the count is filled in from a 15 minute slot. Once the person types a count, that count is kept.
  const [mode, setMode] = useState<"slot" | "count">("slot");
  const [driver, setDriver] = useState(String(START_SLOT));
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<RuleItem | null>(null);
  const [removing, setRemoving] = useState(false);

  const windowLength = windowMinutes(start, end);
  const driverNumber = /^\d+$/.test(driver.trim()) ? Number(driver.trim()) : Number.NaN;
  const known = windowLength !== null && driverNumber >= 1;
  const slotText = mode === "slot" ? driver : known ? String(slotLengthFor(windowLength, driverNumber)) : "";
  const countText = mode === "count" ? driver : known ? String(slotsIn(windowLength, driverNumber)) : "";
  const slotMinutes = /^\d+$/.test(slotText) ? Number(slotText) : Number.NaN;
  const slotKnown = windowLength !== null && slotMinutes >= 1;
  const count = slotKnown ? slotsIn(windowLength, slotMinutes) : 0;
  const left = slotKnown ? windowLength - count * slotMinutes : 0;

  const slotDisplay = slotKnown ? formatDuration(slotMinutes) : "";
  const summary = slotKnown
    ? `${format12h(start)} to ${format12h(end)} is ${formatDuration(windowLength)}: ${count} ${count === 1 ? "slot" : "slots"} of ${formatDuration(slotMinutes)}`
    : "";
  const fitting = slotKnown && left > 0 ? nearest(exactCounts(windowLength, MIN_SLOT, MAX_SLOT), count) : [];

  function clear(field: string) {
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function pickDays(next: number[]) {
    setDays(next);
    clear("weekdays");
  }

  function chooseCount(value: string) {
    setMode("count");
    setDriver(value);
    clear("slot_minutes");
  }

  async function submit() {
    // The slot length is worked out, so its problems are shown under the box that is typed.
    if (slotKnown && count < 1) {
      setErrors({ slot_minutes: "These hours are shorter than one slot." });
      toast.error("Please correct the highlighted fields.");
      return;
    }
    if (Number.isFinite(slotMinutes) && (slotMinutes < MIN_SLOT || slotMinutes > MAX_SLOT)) {
      setErrors({
        slot_minutes: `That gives ${formatDuration(slotMinutes)} slots. Slots must be between ${formatDuration(MIN_SLOT)} and ${formatDuration(MAX_SLOT)}.`,
      });
      toast.error("Please correct the highlighted fields.");
      return;
    }

    const check = rulesSchema.safeParse({
      weekdays: days,
      start_time: start,
      end_time: end,
      slot_minutes: slotMinutes,
      valid_from: from,
      valid_until: until,
    });
    if (!check.success) {
      setErrors(fieldErrorsFromZod(check.error));
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    const response = await addRulesAction(practitionerId, check.data);
    setBusy(false);
    if (!response.ok) {
      if (redirectIfExpired(response.error)) return;
      setErrors(response.error.fieldErrors);
      toast.fromError(response.error, { useFieldMessage: true });
      return;
    }

    const { added, failed } = response.data;
    if (added > 0) toast.success(added === 1 ? "Working hours added." : `Working hours added for ${added} days.`);
    for (const item of failed) toast.error(`${weekdayLabel(item.weekday)}: ${item.message}`);
    if (added > 0) {
      setDays([]);
      setErrors({});
      router.refresh();
    }
  }

  async function remove() {
    if (!target) return;
    setRemoving(true);
    const response = await deleteRuleAction(practitionerId, target.id);
    setRemoving(false);
    setTarget(null);
    if (response.ok) {
      toast.success("Working hours removed.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {rules.length === 0 ? (
        <p className="text-sm text-muted">No working hours yet. Without them this practitioner has no free slots to book.</p>
      ) : (
        <ul className="border border-ink bg-surface">
          {rules.map((rule) => {
            const minutes = /^\d+$/.test(rule.slotMinutes) ? Number(rule.slotMinutes) : Number.NaN;
            return (
              <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-4 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {weekdayLabel(rule.weekday)} · {format12h(rule.start) || rule.start} – {format12h(rule.end) || rule.end}
                  </p>
                  <p className="text-xs text-muted">
                    {rule.slotMinutes ? `${Number.isFinite(minutes) ? formatDuration(minutes) : `${rule.slotMinutes} min`} slots` : ""}
                    {rule.validFrom ? ` · from ${formatLocalDate(rule.validFrom)}` : ""}
                    {rule.validUntil ? ` · until ${formatLocalDate(rule.validUntil)}` : ""}
                  </p>
                </div>
                {canManage && rule.id ? <Button size="sm" variant="secondary" onClick={() => setTarget(rule)}>Remove</Button> : null}
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <div className="border border-ink bg-surface p-6">
          <h3 className="mb-1 font-headline text-xs font-semibold uppercase tracking-wider text-ink">Add working hours</h3>
          <p className="mb-4 text-xs text-muted">Choose the days, then the hours. One rule is added for each day. Hours are in the hospital&apos;s time.</p>

          <fieldset>
            <legend className="mb-2 font-headline text-xs font-semibold uppercase tracking-wider text-ink">Days *</legend>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {WEEKDAY_OPTIONS.map((option) => {
                const day = Number(option.value);
                return (
                  <CheckboxField
                    key={option.value}
                    label={option.label}
                    checked={days.includes(day)}
                    onChange={() => pickDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b))}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex gap-3">
              <Button size="sm" variant="secondary" onClick={() => pickDays([1, 2, 3, 4, 5])}>Mon–Fri</Button>
              <Button size="sm" variant="secondary" onClick={() => pickDays([1, 2, 3, 4, 5, 6])}>Mon–Sat</Button>
            </div>
            {errors.weekdays ? <p className="mt-2 text-xs font-medium text-error">{errors.weekdays}</p> : null}
          </fieldset>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
            <div className="md:col-span-3">
              <TimeField label="From *" value={start} onChange={(v) => { setStart(v); clear("start_time"); clear("end_time"); clear("slot_minutes"); }} error={errors.start_time} />
            </div>
            <div className="md:col-span-3">
              <TimeField label="To *" value={end} onChange={(v) => { setEnd(v); clear("end_time"); clear("slot_minutes"); }} error={errors.end_time} />
            </div>
            <div className="md:col-span-3">
              <ReadOnlyField label="Slot length" value={slotDisplay} hint="From the hours and the patients." />
            </div>
            <div className="md:col-span-3">
              <TextField
                label="Appointments in this window *"
                inputMode="numeric"
                autoComplete="off"
                value={countText}
                onChange={(event) => chooseCount(event.target.value)}
                error={errors.slot_minutes}
                hint="Type how many patients."
              />
            </div>
          </div>

          {summary ? <p className="mt-4 text-sm font-medium text-ink">{summary}</p> : null}
          {left > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-ink">{formatDuration(left)} is left over after the last slot.</span>
              {fitting.length > 0 ? <span className="text-muted">Fits exactly:</span> : null}
              {fitting.map((n) => (
                <Button key={n} size="sm" variant="secondary" onClick={() => chooseCount(String(n))}>
                  {n} patients
                </Button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
            <div className="md:col-span-3">
              <DateField label="Valid from" value={from} onChange={setFrom} disableFuture={false} minYear={2020} error={errors.valid_from} hint="Optional" />
            </div>
            <div className="md:col-span-3">
              <DateField label="Valid until" value={until} onChange={setUntil} disableFuture={false} minYear={2020} error={errors.valid_until} hint="Optional" />
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={submit} loading={busy}>Add working hours</Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        title="Remove these working hours?"
        description="Slots that come from this rule disappear from booking. Appointments that are already booked are not cancelled."
        confirmLabel="Remove"
        busy={removing}
        onConfirm={remove}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import {
  addDays,
  addMonths,
  formatDisplay,
  localTodayIso,
  maskInput,
  MONTH_NAMES,
  monthWeeks,
  parseDisplay,
  parseIso,
  WEEKDAYS,
} from "@/lib/calendar";
import { describedBy, FieldShell } from "./field-shell";
import { Input } from "./input";

type Props = {
  label: string;
  /** "YYYY-MM-DD", or "" when empty. While the typed text is not a real date the raw text is passed instead, so validation can refuse it. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  error?: string;
  hint?: string;
  id?: string;
  minYear?: number;
  disableFuture?: boolean;
};

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

const navButton =
  "flex h-9 w-9 items-center justify-center border border-ink text-ink hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";
const dropdown = "h-9 min-w-0 flex-1 border border-ink bg-surface px-2 text-sm text-ink hover:border-primary";

export function DateField({ label, value, onChange, onBlur, name, error, hint, id, minYear = 1900, disableFuture = true }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const todayIso = useMemo(() => localTodayIso(), []);
  const todayYear = Number(todayIso.slice(0, 4));
  const todayMonth = Number(todayIso.slice(5, 7));
  const maxYear = disableFuture ? todayYear : todayYear + 20;

  const [text, setText] = useState(() => formatDisplay(value));
  const [open, setOpen] = useState(false);
  const [focusIso, setFocusIso] = useState(todayIso);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(false);

  const selected = parseIso(value) ? value : null;
  const view = parseIso(focusIso) ?? { y: todayYear, m: todayMonth, d: 1 };
  const weeks = useMemo(() => monthWeeks(view.y, view.m), [view.y, view.m]);
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i), [maxYear, minYear]);

  // Keep the typed text in step when the form changes the value from outside (for example reset()).
  useEffect(() => {
    if (value === "") {
      setText((t) => (t === "" ? t : ""));
      return;
    }
    if (parseIso(value)) setText((t) => (parseDisplay(t) === value ? t : formatDisplay(value)));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open && wantFocus.current) {
      wantFocus.current = false;
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusIso}"]`)?.focus();
    }
  }, [open, focusIso]);

  const clamp = (iso: string) => (disableFuture && iso > todayIso ? todayIso : iso);
  const isBlocked = (iso: string) => disableFuture && iso > todayIso;

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const masked = maskInput(event.target.value);
    setText(masked);
    if (masked === "") {
      onChange("");
      return;
    }
    const iso = parseDisplay(masked);
    onChange(iso && !isBlocked(iso) ? iso : masked);
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setFocusIso(clamp(selected ?? todayIso));
    wantFocus.current = true;
    setOpen(true);
  }

  function choose(iso: string) {
    setText(formatDisplay(iso));
    onChange(iso);
    setOpen(false);
    inputRef.current?.focus();
  }

  function clear() {
    setText("");
    onChange("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function moveTo(iso: string, focusDay: boolean) {
    if (Number(iso.slice(0, 4)) < minYear) return;
    wantFocus.current = focusDay;
    setFocusIso(clamp(iso));
  }

  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, string> = {
      ArrowLeft: addDays(focusIso, -1),
      ArrowRight: addDays(focusIso, 1),
      ArrowUp: addDays(focusIso, -7),
      ArrowDown: addDays(focusIso, 7),
      PageUp: addMonths(focusIso, event.shiftKey ? -12 : -1),
      PageDown: addMonths(focusIso, event.shiftKey ? 12 : 1),
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    moveTo(next, true);
  }

  function onPopoverKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      inputRef.current?.focus();
    }
  }

  const atFirstMonth = view.y === minYear && view.m === 1;
  const atLastMonth = disableFuture && view.y * 12 + view.m >= todayYear * 12 + todayMonth;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <div ref={wrapRef} className="relative">
        <Input
          ref={inputRef}
          id={fieldId}
          name={name}
          value={text}
          onChange={onInputChange}
          onBlur={onBlur}
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          maxLength={10}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, { error, hint })}
          className="pr-12"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            onClick={toggle}
            aria-label="Choose date"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center text-ink hover:text-primary"
          >
            <CalendarIcon />
          </button>
        </div>

        {open ? (
          <div role="dialog" aria-label="Choose date" onKeyDown={onPopoverKey} className="absolute left-0 top-full z-20 mt-1 w-72 border border-ink bg-surface p-3">
            <div className="flex items-center gap-2">
              <button type="button" className={navButton} aria-label="Previous month" disabled={atFirstMonth} onClick={() => moveTo(addMonths(focusIso, -1), false)}>
                ‹
              </button>
              <select
                aria-label="Month"
                className={dropdown}
                value={view.m}
                onChange={(e) => moveTo(addMonths(focusIso, Number(e.target.value) - view.m), false)}
              >
                {MONTH_NAMES.map((monthName, index) => (
                  <option key={monthName} value={index + 1}>{monthName}</option>
                ))}
              </select>
              <select
                aria-label="Year"
                className={dropdown}
                value={view.y}
                onChange={(e) => moveTo(addMonths(focusIso, (Number(e.target.value) - view.y) * 12), false)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button type="button" className={navButton} aria-label="Next month" disabled={atLastMonth} onClick={() => moveTo(addMonths(focusIso, 1), false)}>
                ›
              </button>
            </div>

            <div aria-hidden="true" className="mt-3 grid grid-cols-7 place-items-center font-headline text-xs uppercase text-muted">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="flex h-8 items-center">{weekday}</span>
              ))}
            </div>

            <div ref={gridRef} onKeyDown={onGridKey} className="grid grid-cols-7 place-items-center">
              {weeks.flat().map((iso, index) => {
                if (!iso) return <span key={`empty-${index}`} className="h-9 w-9" />;
                const day = Number(iso.slice(8, 10));
                const blocked = isBlocked(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    data-iso={iso}
                    disabled={blocked}
                    tabIndex={iso === focusIso ? 0 : -1}
                    aria-label={`${day} ${MONTH_NAMES[view.m - 1]} ${view.y}`}
                    aria-pressed={iso === selected}
                    aria-current={iso === todayIso ? "date" : undefined}
                    onClick={() => choose(iso)}
                    className={clsx(
                      "h-9 w-9 text-sm",
                      iso === selected ? "bg-ink text-white" : "text-ink hover:bg-accent",
                      iso === todayIso && iso !== selected && "border border-ink",
                      blocked && "cursor-not-allowed text-muted opacity-40 hover:bg-transparent",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-between border-t border-accent pt-3 text-sm">
              <button type="button" className="font-medium text-ink underline hover:text-primary" onClick={() => choose(todayIso)}>
                Today
              </button>
              <button type="button" className="font-medium text-ink underline hover:text-primary" onClick={clear}>
                Clear
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}
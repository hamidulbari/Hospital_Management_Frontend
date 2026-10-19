"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import clsx from "clsx";
import { format12h, from12h, to12h, type Meridiem } from "@/lib/time-input";
import { describedBy, FieldShell } from "./field-shell";

type Props = {
  label: string;
  /** 24-hour "HH:mm" (what the server uses), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  id?: string;
  /** Minutes are offered every this many minutes. */
  minuteStep?: number;
};

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];
const FIRST = { hour: 9, minute: 0, meridiem: "AM" as Meridiem }; // what an empty field starts from
const pad = (n: number) => String(n).padStart(2, "0");

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Moves one place up or down a list and stops at the ends. */
function step<T>(items: readonly T[], current: T, delta: number): T {
  const index = items.indexOf(current);
  const next = Math.min(items.length - 1, Math.max(0, (index < 0 ? 0 : index) + delta));
  return items[next];
}

type ColumnProps = {
  label: string;
  items: { key: string; text: string; selected: boolean; pick: () => void }[];
  innerRef?: Ref<HTMLUListElement>;
  onMove: (delta: number) => void;
  className?: string;
};

function Column({ label, items, innerRef, onMove, className }: ColumnProps) {
  return (
    <ul
      ref={innerRef}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onMove(1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          onMove(-1);
        }
      }}
      className={clsx("relative h-48 overflow-y-auto border-r border-accent py-1 last:border-r-0", className)}
    >
      {items.map((item) => (
        <li
          key={item.key}
          role="option"
          aria-selected={item.selected}
          onClick={item.pick}
          className={clsx(
            "mx-1 flex h-9 cursor-pointer items-center justify-center text-sm",
            item.selected ? "bg-ink font-semibold text-white" : "text-ink hover:bg-accent",
          )}
        >
          {item.text}
        </li>
      ))}
    </ul>
  );
}

/** A 12-hour time picker: hour, minute and AM/PM in three columns. It gives and takes 24-hour "HH:mm". */
export function TimeField({ label, value, onChange, onBlur, error, hint, id, minuteStep = 5 }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hourRef = useRef<HTMLUListElement>(null);
  const minuteRef = useRef<HTMLUListElement>(null);

  const parts = to12h(value);
  const text = format12h(value);
  const currentMinute = parts?.minute ?? -1;

  const minutes = useMemo(() => {
    const list: number[] = [];
    for (let m = 0; m < 60; m += minuteStep) list.push(m);
    if (currentMinute >= 0 && !list.includes(currentMinute)) list.push(currentMinute); // keep an odd minute from the server
    return list.sort((a, b) => a - b);
  }, [minuteStep, currentMinute]);

  function close(returnFocus: boolean) {
    setOpen(false);
    onBlur?.();
    if (returnFocus) triggerRef.current?.focus();
  }

  // Whatever is picked first, the rest starts from 09:00 AM. Every pick is saved at once.
  function commit(next: Partial<{ hour: number; minute: number; meridiem: Meridiem }>) {
    const merged = { ...(parts ?? FIRST), ...next };
    onChange(from12h(merged.hour, merged.minute, merged.meridiem));
  }

  function clear() {
    onChange("");
    onBlur?.();
  }

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onBlur]);

  // Bring the chosen hour and minute to the middle of their columns when the list opens.
  useEffect(() => {
    if (!open) return;
    for (const column of [hourRef.current, minuteRef.current]) {
      const selected = column?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (column && selected) column.scrollTop = selected.offsetTop - column.clientHeight / 2 + selected.clientHeight / 2;
    }
  }, [open]);

  function onPopoverKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      close(true);
    }
  }

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <div ref={wrapRef} className="relative">
        <button
          ref={triggerRef}
          id={fieldId}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, { error, hint })}
          onClick={() => (open ? close(false) : setOpen(true))}
          className="flex h-10 w-full items-center gap-2 border border-ink bg-surface pl-3 pr-14 text-left text-sm text-ink hover:border-primary aria-[invalid=true]:border-2 aria-[invalid=true]:border-error"
        >
          <ClockIcon />
          <span className={text ? "text-ink" : "text-muted"}>{text || "--:-- --"}</span>
        </button>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
          {text ? (
            <button
              type="button"
              aria-label="Clear time"
              onClick={clear}
              className="pointer-events-auto flex h-10 w-8 items-center justify-center text-lg leading-none text-ink hover:text-primary"
            >
              ×
            </button>
          ) : null}
          <span className="pr-3 text-ink">
            <Chevron />
          </span>
        </div>

        {open ? (
          <div role="dialog" aria-label={`Choose ${label}`} onKeyDown={onPopoverKey} className="absolute left-0 top-full z-20 mt-1 border border-ink bg-surface">
            <div className="flex">
              <Column
                label="Hour"
                innerRef={hourRef}
                className="w-16"
                onMove={(delta) => commit({ hour: step(HOURS, parts?.hour ?? FIRST.hour, delta) })}
                items={HOURS.map((hour) => ({ key: String(hour), text: pad(hour), selected: parts?.hour === hour, pick: () => commit({ hour }) }))}
              />
              <Column
                label="Minute"
                innerRef={minuteRef}
                className="w-16"
                onMove={(delta) => commit({ minute: step(minutes, parts?.minute ?? FIRST.minute, delta) })}
                items={minutes.map((minute) => ({ key: String(minute), text: pad(minute), selected: parts?.minute === minute, pick: () => commit({ minute }) }))}
              />
              <Column
                label="AM or PM"
                className="w-16"
                onMove={(delta) => commit({ meridiem: step(MERIDIEMS, parts?.meridiem ?? FIRST.meridiem, delta) })}
                items={MERIDIEMS.map((meridiem) => ({ key: meridiem, text: meridiem, selected: parts?.meridiem === meridiem, pick: () => commit({ meridiem }) }))}
              />
            </div>
            <div className="flex items-center justify-between border-t border-accent px-3 py-2 text-sm">
              <button type="button" className="font-medium text-ink underline hover:text-primary" onClick={() => { clear(); setOpen(false); triggerRef.current?.focus(); }}>
                Clear
              </button>
              <button type="button" className="font-semibold text-ink underline hover:text-primary" onClick={() => close(true)}>
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}
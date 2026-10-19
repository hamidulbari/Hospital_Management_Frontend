"use client";

import "flag-icons/css/flag-icons.min.css";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { CountryCode } from "libphonenumber-js/min";
import { DEFAULT_PHONE_COUNTRY, joinPhone, phoneCountries, splitPhone } from "@/lib/phone";
import { describedBy, FieldShell } from "./field-shell";
import { Input } from "./input";
import { ListboxSelect, type SelectOption } from "./listbox-select";

type Props = {
  label: string;
  /** "+919876543210", or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  error?: string;
  hint?: string;
  id?: string;
  defaultCountry?: CountryCode;
};

function Flag({ code }: { code: string }) {
  return <span className={`fi fi-${code.toLowerCase()}`} aria-hidden="true" />;
}

export function PhoneField({ label, value, onChange, onBlur, name, error, hint, id, defaultCountry = DEFAULT_PHONE_COUNTRY }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  const initial = useMemo(() => (value ? splitPhone(value) : null), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<CountryCode>(initial?.country ?? defaultCountry);
  const [digits, setDigits] = useState(initial?.digits ?? "");
  const lastEmitted = useRef(value);

  const entries = useMemo(() => phoneCountries(defaultCountry), [defaultCountry]);
  const options = useMemo<SelectOption[]>(
    () => entries.map((c) => ({ value: c.code, label: c.name, searchText: `${c.dial} ${c.code}` })),
    [entries],
  );
  const dialOf = useMemo(() => new Map<string, string>(entries.map((c) => [c.code, c.dial])), [entries]);

  function emit(next: string) {
    lastEmitted.current = next;
    onChange(next);
  }

  // The form changed the value from outside (for example a reset): follow it.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    if (value === "") {
      setDigits("");
      return;
    }
    const parsed = splitPhone(value);
    if (parsed) {
      setCountry(parsed.country);
      setDigits(parsed.digits);
    }
  }, [value]);

  function pickCountry(code: string) {
    const next = code as CountryCode;
    setCountry(next);
    emit(joinPhone(next, digits));
  }

  function onDigits(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.replace(/\D/g, "").slice(0, 15);
    setDigits(next);
    emit(joinPhone(country, next));
  }

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <div className="flex gap-2">
        <div className="w-32 shrink-0">
          <ListboxSelect
            id={`${fieldId}-country`}
            ariaLabel="Country code"
            value={country}
            onChange={pickCountry}
            options={options}
            popoverClassName="w-80"
            renderValue={(option) => (
              <>
                <Flag code={option.value} />
                <span>+{dialOf.get(option.value)}</span>
              </>
            )}
            renderOption={(option) => (
              <>
                <Flag code={option.value} />
                <span className="flex-1 truncate">{option.label}</span>
                <span className="text-muted">+{dialOf.get(option.value)}</span>
              </>
            )}
          />
        </div>
        <Input
          id={fieldId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={digits}
          onChange={onDigits}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, { error, hint })}
        />
      </div>
    </FieldShell>
  );
}
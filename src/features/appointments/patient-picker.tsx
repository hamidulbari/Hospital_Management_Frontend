"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField, type Option } from "@/components/ui/select-field";
import { searchPatientsAction } from "@/features/patients/actions";
import type { PatientSearchResult } from "@/features/patients/parse";

export type PickedPatient = { id: string; name: string; mrn: string };

const FIELD_OPTIONS: Option[] = [
  { value: "name", label: "Name" },
  { value: "phone", label: "Phone" },
  { value: "mrn", label: "MRN" },
];

export function PatientPicker({ value, onChange, error }: { value: PickedPatient | null; onChange: (patient: PickedPatient | null) => void; error?: string }) {
  const [field, setField] = useState("name");
  const [text, setText] = useState("");
  const [result, setResult] = useState<PatientSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  async function search() {
    const term = text.trim();
    if (!term) {
      setMessage("Enter a name, phone number or MRN.");
      return;
    }
    setSearching(true);
    setMessage(undefined);
    const response = await searchPatientsAction({
      name: field === "name" ? term : "",
      phone: field === "phone" ? term : "",
      mrn: field === "mrn" ? term : "",
      date_of_birth: "",
      page: 1,
    });
    setSearching(false);

    if (response.ok) {
      setResult(response.data);
      return;
    }
    if (response.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    setResult(null);
    setMessage(Object.values(response.error.fieldErrors)[0] ?? response.error.message);
  }

  if (value) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-ink bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-ink">{value.name}</p>
          <p className="text-xs text-muted">MRN {value.mrn || "—"}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            onChange(null);
            setResult(null);
          }}
        >
          Change patient
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <SelectField label="Search by" options={FIELD_OPTIONS} value={field} onChange={setField} />
        </div>
        <div className="md:col-span-6">
          <Input
            aria-label="Search term"
            autoComplete="off"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
          />
        </div>
        <div className="md:col-span-3">
          <Button variant="secondary" loading={searching} onClick={search} className="w-full">Search patient</Button>
        </div>
      </div>
      {message || error ? <p className="text-xs font-medium text-error">{message ?? error}</p> : null}

      {result ? (
        result.items.length === 0 ? (
          <p className="text-sm text-muted">No patient found. Check the spelling or register the patient first.</p>
        ) : (
          <div className="border border-ink bg-surface">
            <ul>
              {result.items.map((patient) => (
                <li key={patient.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{patient.displayName || "Unnamed patient"}</p>
                    <p className="text-xs text-muted">MRN {patient.mrn || "—"} · {patient.phone || "no phone"}</p>
                  </div>
                  <Button size="sm" onClick={() => onChange({ id: patient.id, name: patient.displayName, mrn: patient.mrn })}>Select</Button>
                </li>
              ))}
            </ul>
            {result.total > result.items.length ? (
              <p className="border-t border-accent p-3 text-xs text-muted">
                Showing the first {result.items.length} of {result.total}. Narrow the search to find the right patient.
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
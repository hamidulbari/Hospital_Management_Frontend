import type { HospitalContext } from "@/lib/hospital";

/** The hospital heading of a printed bill. Only what the hospital profile has is shown. */
export function HospitalBlock({ hospital }: { hospital: HospitalContext | null }) {
  const contact = [hospital?.phone ? `Ph: ${hospital.phone}` : "", hospital?.email ?? ""].filter(Boolean).join(", ");

  return (
    <div className="text-[9pt] leading-snug">
      <p className="font-headline text-[17pt] font-bold leading-tight tracking-tight">{hospital?.name || "HMS"}</p>
      {hospital?.registrationNo ? <p className="mt-1">Reg. No. {hospital.registrationNo}</p> : null}
      {hospital?.addressLines.map((line) => <p key={line}>{line}</p>)}
      {contact ? <p>{contact}</p> : null}
      {hospital?.gstin ? <p>GSTIN: {hospital.gstin}</p> : null}
    </div>
  );
}
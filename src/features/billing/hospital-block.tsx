export type PrintHospital = {
  name: string;
  registrationNo?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

/** The hospital heading of a printed bill. Only what the server sent is shown. */
export function HospitalBlock({ hospital }: { hospital: PrintHospital }) {
  const place = [[hospital.city, hospital.state].filter(Boolean).join(", "), hospital.pincode].filter(Boolean).join(" - ");
  const contact = [hospital.phone ? `Ph: ${hospital.phone}` : "", hospital.email ?? ""].filter(Boolean).join(", ");

  return (
    <div className="text-[9pt] leading-snug">
      <p className="font-headline text-[17pt] font-bold leading-tight tracking-tight">{hospital.name || "HMS"}</p>
      {hospital.registrationNo ? <p className="mt-1">Reg. No. {hospital.registrationNo}</p> : null}
      {place ? <p>{place}</p> : null}
      {contact ? <p>{contact}</p> : null}
      {hospital.gstin ? <p>GSTIN: {hospital.gstin}</p> : null}
    </div>
  );
}

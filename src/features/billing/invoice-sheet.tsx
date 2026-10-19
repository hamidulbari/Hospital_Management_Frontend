import { SEX_OPTIONS, labelFor } from "@/features/patients/options";
import { formatAge } from "@/lib/age";
import { showInstant } from "@/lib/format-instant";
import type { HospitalContext } from "@/lib/hospital";
import { groupLines, type ServiceIndex } from "./bill-groups";
import { HospitalBlock } from "./hospital-block";
import { fmt, isZeroMoney, type MoneyFormat } from "./money-format";
import { amountInWords } from "./numbers-to-words";
import { INVOICE_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from "./options";
import type { InvoiceDetail } from "./parse";

type Props = {
  invoice: InvoiceDetail;
  hospital: HospitalContext | null;
  serviceIndex: ServiceIndex;
  moneyFormat: MoneyFormat;
  timezone: string | null;
  today: string;
  printedBy: string;
  printedAt: string;
};

const th = "py-1.5 font-headline text-[7.5pt] uppercase tracking-wider";
const td = "border-b border-[#e2e8f0] py-1.5 align-top";

function Info({ label, value }: { label: string; value: string }) {
  return value ? (
    <p>
      <span className="font-semibold">{label}:</span> {value}
    </p>
  ) : null;
}

/** The A4 paper version of a bill. Every amount is the server's. Nothing is added up here. */
export function InvoiceSheet({ invoice, hospital, serviceIndex, moneyFormat, timezone, today, printedBy, printedAt }: Props) {
  const draft = invoice.status === "draft";
  const cancelled = invoice.status === "cancelled";
  const groups = groupLines(invoice.lines, serviceIndex);
  const cellFormat: MoneyFormat = { ...moneyFormat, currency: undefined };
  const age = invoice.patientDob ? formatAge(invoice.patientDob, today) : "";
  const sex = invoice.patientSex ? labelFor(SEX_OPTIONS, invoice.patientSex) : "";
  const paidWords = invoice.paid ? amountInWords(invoice.paid, moneyFormat.currency) : "";

  const totals = [
    { label: "Subtotal", value: invoice.subtotal },
    { label: "Discount", value: invoice.discountTotal },
    { label: "Tax", value: invoice.taxTotal },
    { label: "Total bill amount", value: invoice.total, strong: true },
    { label: "Amount paid", value: invoice.paid },
    { label: "Balance", value: invoice.balance, strong: true },
  ].filter((row) => row.value !== "");

  return (
    <div className="text-[9pt] leading-snug text-ink">
      <HospitalBlock hospital={hospital} />
      <hr className="my-3 border-ink" />

      <section className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-0.5">
          <Info label="Patient MRN" value={invoice.patientMrn} />
          <Info label="Name" value={`${invoice.patientName}${sex ? ` (${sex})` : ""}`} />
          <Info label="Age" value={age} />
          <Info label="Contact" value={invoice.patientPhone} />
        </div>
        <div className="flex flex-col gap-0.5">
          <Info label="Date" value={showInstant(invoice.issuedAt, timezone)} />
          <Info label="Invoice No." value={invoice.number} />
          <Info label="Status" value={draft ? "Not issued" : labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} />
        </div>
      </section>
      <hr className="my-3 border-ink" />

      <p className="text-center font-headline text-[11pt] font-bold uppercase tracking-widest">
        {draft ? "Provisional bill" : "Bill"}
        {cancelled ? <span className="text-error"> — Cancelled</span> : null}
      </p>
      {moneyFormat.currency ? <p className="mt-1 text-center text-[8pt] text-muted">All amounts in {moneyFormat.currency}</p> : null}

      <p className="mt-5 border-b border-ink pb-1 text-center font-headline text-[9pt] font-bold uppercase tracking-widest">Detailed breakup</p>
      <table className="w-full">
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className={`${th} w-[18mm] pr-2 text-left`}>Code</th>
            <th scope="col" className={`${th} pr-2 text-left`}>Particulars</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Rate</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Units</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Disc.</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Tax %</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Amount</th>
          </tr>
        </thead>
        {groups.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={7} className="py-3 text-muted">No lines.</td>
            </tr>
          </tbody>
        ) : (
          groups.map((group) => (
            <tbody key={group.key}>
              <tr>
                <td colSpan={7} className="pb-1 pt-3 font-headline text-[9pt] font-bold">{group.label}</td>
              </tr>
              {group.lines.map((line, index) => (
                <tr key={index}>
                  <td className={`${td} pr-2`}>{line.code || "—"}</td>
                  <td className={`${td} pr-2`}>{line.description || "—"}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(line.unitPrice, cellFormat)}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{line.quantity || "—"}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>
                    {line.discount && !isZeroMoney(line.discount) ? fmt(line.discount, cellFormat) : "—"}
                  </td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{line.taxPercent || "—"}</td>
                  <td className={`${td} pl-2 text-right font-semibold tabular-nums`}>{fmt(line.total, cellFormat)}</td>
                </tr>
              ))}
            </tbody>
          ))
        )}
      </table>

      {totals.length > 0 ? (
        <div className="mt-5 flex justify-end">
          <dl className="w-[80mm]">
            {totals.map((row) => (
              <div
                key={row.label}
                className={row.strong ? "mt-1 flex justify-between border-t border-ink pt-1.5 text-[10.5pt] font-bold" : "flex justify-between py-0.5"}
              >
                <dt>{row.label}</dt>
                <dd className="tabular-nums">{fmt(row.value, moneyFormat)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {paidWords ? (
        <p className="mt-2 text-right">
          <span className="font-semibold">Paid amount in words:</span> {paidWords}
        </p>
      ) : null}

      {invoice.payments.length > 0 ? (
        <section className="mt-7">
          <p className="border-b border-ink pb-1 text-center font-headline text-[9pt] font-bold uppercase tracking-widest">Payments</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className={`${th} pr-2 text-left`}>Receipt</th>
                <th scope="col" className={`${th} pr-2 text-left`}>Date</th>
                <th scope="col" className={`${th} pr-2 text-left`}>Method</th>
                <th scope="col" className={`${th} pr-2 text-left`}>Reference</th>
                <th scope="col" className={`${th} pl-2 text-right`}>Amount</th>
                <th scope="col" className={`${th} pl-2 text-right`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment, index) => {
                const reversed = payment.status === "reversed";
                return (
                  <tr key={payment.id || index}>
                    <td className={`${td} pr-2 font-semibold`}>{payment.receipt || "—"}</td>
                    <td className={`${td} pr-2`}>{showInstant(payment.at, timezone) || "—"}</td>
                    <td className={`${td} pr-2`}>{payment.method ? labelFor(PAYMENT_METHOD_OPTIONS, payment.method) : "—"}</td>
                    <td className={`${td} pr-2`}>{payment.reference || "—"}</td>
                    <td className={`${td} pl-2 text-right tabular-nums ${reversed ? "text-muted line-through" : "font-semibold"}`}>
                      {fmt(payment.amount, cellFormat)}
                    </td>
                    <td className={`${td} pl-2 text-right`}>{reversed ? "Reversed" : "Posted"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="mt-16 flex justify-between gap-10 text-[8.5pt]">
        <div className="w-[60mm] border-t border-ink pt-1">Patient / payer signature</div>
        <div className="w-[60mm] border-t border-ink pt-1 text-right">Authorised signatory</div>
      </div>

      <footer className="mt-6 flex justify-between gap-6 text-[7.5pt] text-muted">
        <span>Printed by {printedBy}, {printedAt}</span>
        <span>{hospital?.name || "HMS"}</span>
      </footer>
    </div>
  );
}
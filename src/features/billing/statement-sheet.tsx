import { labelFor } from "@/features/patients/options";
import { showInstant } from "@/lib/format-instant";
import { HospitalBlock } from "./hospital-block";
import { fmt, type MoneyFormat } from "./money-format";
import { INVOICE_STATUS_OPTIONS } from "./options";
import type { Statement } from "./parse";

type Props = {
  statement: Statement;
  hospitalName: string;
  moneyFormat: MoneyFormat;
  timezone: string | null;
  asOf: string;
  printedBy: string;
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

/** The A4 paper version of a patient statement. Amounts are the server's. The statement carries no hospital address. */
export function StatementSheet({ statement, hospitalName, moneyFormat, timezone, asOf, printedBy }: Props) {
  const cellFormat: MoneyFormat = { ...moneyFormat, currency: undefined };
  const currency = statement.currency || moneyFormat.currency;

  return (
    <div className="text-[9pt] leading-snug text-ink">
      <HospitalBlock hospital={{ name: hospitalName }} />
      <hr className="my-3 border-ink" />

      <section className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-0.5">
          <Info label="Patient MRN" value={statement.patientMrn} />
          <Info label="Name" value={statement.patientName} />
        </div>
        <div className="flex flex-col gap-0.5">
          <Info label="As of" value={asOf} />
        </div>
      </section>
      <hr className="my-3 border-ink" />

      <p className="text-center font-headline text-[11pt] font-bold uppercase tracking-widest">Statement of account</p>
      {currency ? <p className="mt-1 text-center text-[8pt] text-muted">All amounts in {currency}</p> : null}

      <table className="mt-5 w-full">
        <thead>
          <tr className="border-y border-ink">
            <th scope="col" className={`${th} pr-2 text-left`}>Invoice</th>
            <th scope="col" className={`${th} pr-2 text-left`}>Date</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Total</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Paid</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Balance</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {statement.invoices.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-3 text-muted">No issued invoices.</td>
            </tr>
          ) : (
            statement.invoices.map((invoice, index) => (
              <tr key={invoice.id || index}>
                <td className={`${td} pr-2 font-semibold`}>{invoice.number || "\u2014"}</td>
                <td className={`${td} pr-2`}>{showInstant(invoice.date, timezone) || "\u2014"}</td>
                <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(invoice.total, cellFormat)}</td>
                <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(invoice.paid, cellFormat)}</td>
                <td className={`${td} pl-2 text-right font-semibold tabular-nums`}>{fmt(invoice.balance, cellFormat)}</td>
                <td className={`${td} pl-2 text-right`}>{labelFor(INVOICE_STATUS_OPTIONS, invoice.status)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-5 flex justify-end">
        <div className="flex w-[80mm] justify-between border-t border-ink pt-1.5 text-[10.5pt] font-bold">
          <span>Outstanding</span>
          <span className="tabular-nums">{fmt(statement.outstanding, moneyFormat)}</span>
        </div>
      </div>

      <div className="mt-16 flex justify-end text-[8.5pt]">
        <div className="w-[60mm] border-t border-ink pt-1 text-right">Authorised signatory</div>
      </div>

      <footer className="mt-6 flex justify-between gap-6 text-[7.5pt] text-muted">
        <span>Printed by {printedBy}, {asOf}</span>
        <span>{hospitalName || "HMS"}</span>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { PrintButton } from "@/components/ui/print-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fmt } from "@/features/billing/money-format";
import { INVOICE_STATUS_OPTIONS, invoiceTone } from "@/features/billing/options";
import { parseStatement } from "@/features/billing/parse";
import { loadMoneyFormat } from "@/features/billing/server";
import { StatementSheet } from "@/features/billing/statement-sheet";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { showInstant } from "@/lib/format-instant";
import { getHospital, hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function StatementPage({ params }: { params: Promise<{ patientId: string }> }) {
  const session = await requireSession();
  const { patientId } = await params;
  if (!/^[0-9a-z]{26}$/i.test(patientId)) notFound();
  if (!can(session.permissions, "billing.statement.view")) return <NoAccess />;

  const [result, now, moneyFormat, hospital] = await Promise.all([
    apiLoad<unknown>(`/billing/patients/${patientId}/statement`),
    hospitalNow(),
    loadMoneyFormat(),
    getHospital(),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const statement = parseStatement(result.data);

  return (
    <>
      {/* The screen version. It does not print: the A4 sheet below does. */}
      <div className="print:hidden">
        <PageHeader
          title={statement.patientName || "Patient statement"}
          description={statement.patientMrn ? `MRN ${statement.patientMrn}` : undefined}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PrintButton />
              <LinkButton href="/billing/statement" variant="secondary">Another patient</LinkButton>
            </div>
          }
        />

        <div className="mb-8 border border-ink bg-surface p-6">
          <p className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">Outstanding</p>
          <p className="mt-3 whitespace-nowrap font-headline text-4xl font-bold leading-none tracking-tight text-ink">{fmt(statement.outstanding, moneyFormat)}</p>
          <p className="mt-3 text-xs text-muted">Worked out by the server from the issued invoices below.</p>
        </div>

        {statement.invoices.length === 0 ? (
          <p className="text-sm text-muted">No issued invoices.</p>
        ) : (
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Invoice</th>
                  <th scope="col" className="p-3">Date</th>
                  <th scope="col" className="p-3 text-right">Total</th>
                  <th scope="col" className="p-3 text-right">Paid</th>
                  <th scope="col" className="p-3 text-right">Balance</th>
                  <th scope="col" className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {statement.invoices.map((invoice, index) => (
                  <tr key={invoice.id || index} className="border-b border-accent last:border-b-0 hover:bg-accent">
                    <td className="p-3">
                      {invoice.id && can(session.permissions, "billing.invoice.view") ? (
                        <Link href={`/billing/${invoice.id}`} prefetch={false} className="font-medium underline">{invoice.number || (invoice.status === "draft" ? "Draft" : "—")}</Link>
                      ) : (
                        <span className="font-medium">{invoice.number || "—"}</span>
                      )}
                    </td>
                    <td className="p-3 text-muted">{showInstant(invoice.date, now.timezone) || "—"}</td>
                    <td className="p-3 text-right">{fmt(invoice.total, moneyFormat)}</td>
                    <td className="p-3 text-right">{fmt(invoice.paid, moneyFormat)}</td>
                    <td className="p-3 text-right font-medium">{fmt(invoice.balance, moneyFormat)}</td>
                    <td className="p-3">
                      <StatusBadge label={labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} tone={invoiceTone(invoice.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* The paper version (A4). Only this prints. */}
      <div className="hidden print:block">
        <StatementSheet
          statement={statement}
          hospital={hospital}
          moneyFormat={moneyFormat}
          timezone={now.timezone}
          asOf={`${formatLocalDate(now.today)}, ${now.time}`}
          printedBy={session.name}
        />
      </div>
    </>
  );
}
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { PrintButton } from "@/components/ui/print-button";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ServiceIndex } from "@/features/billing/bill-groups";
import { CancelInvoice } from "@/features/billing/cancel-invoice";
import { DraftTools } from "@/features/billing/draft-tools";
import { InvoiceSheet } from "@/features/billing/invoice-sheet";
import { linesToDrafts } from "@/features/billing/lines";
import { fmt, isZeroMoney } from "@/features/billing/money-format";
import { INVOICE_STATUS_OPTIONS, invoiceTone } from "@/features/billing/options";
import { parseInvoice } from "@/features/billing/parse";
import { PaymentForm } from "@/features/billing/payment-form";
import { PaymentsList } from "@/features/billing/payments-list";
import { loadMoneyFormat, loadServiceIndex, loadServiceOptions } from "@/features/billing/server";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { getHospital, hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-z]{26}$/i.test(id)) notFound();
  const p = session.permissions;
  if (!can(p, "billing.invoice.view")) return <NoAccess />;

  const noIndex: Promise<ServiceIndex> = Promise.resolve({});
  const [result, now, moneyFormat, hospital, serviceIndex] = await Promise.all([
    apiLoad<unknown>(`/billing/invoices/${id}`),
    hospitalNow(),
    loadMoneyFormat(),
    getHospital(),
    can(p, "billing.service.view") ? loadServiceIndex() : noIndex,
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const invoice = parseInvoice(result.data);
  const draft = invoice.status === "draft";
  const payable = (invoice.status === "issued" || invoice.status === "partially_paid") && invoice.balance !== "" && !isZeroMoney(invoice.balance);
  const services = draft && can(p, "billing.invoice.create") && can(p, "billing.service.view") ? await loadServiceOptions(moneyFormat) : { options: [], error: null };

  // The title follows the STATUS: only a draft has no number.
  const screenTitle = invoice.number || (draft ? "Draft invoice" : "Invoice");

  const totals = [
    { label: "Subtotal", value: invoice.subtotal },
    { label: "Discount", value: invoice.discountTotal },
    { label: "Tax", value: invoice.taxTotal },
    { label: "Total", value: invoice.total, strong: true },
    { label: "Paid", value: invoice.paid },
    { label: "Balance", value: invoice.balance, strong: true },
  ].filter((row) => row.value !== "");

  return (
    <>
      {/* The screen version. It does not print: the A4 sheet below does. */}
      <div className="print:hidden">
        <PageHeader
          title={screenTitle}
          description={[invoice.patientName, invoice.patientMrn ? `MRN ${invoice.patientMrn}` : ""].filter(Boolean).join(" · ")}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge label={labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} tone={invoiceTone(invoice.status)} />
              <PrintButton />
              {invoice.patientId && can(p, "billing.statement.view") ? (
                <LinkButton href={`/billing/statement/${invoice.patientId}`} variant="secondary">Patient statement</LinkButton>
              ) : null}
              <LinkButton href="/billing" variant="secondary">All invoices</LinkButton>
            </div>
          }
        />

        <div className="flex flex-col gap-10">
          {invoice.status === "cancelled" ? <Notice>This invoice is cancelled. It stays on record with its number.</Notice> : null}
          {services.error ? <ErrorNotice error={services.error} /> : null}

          <Section title="Lines">
            {invoice.lines.length === 0 ? (
              <p className="text-sm text-muted">No lines yet.</p>
            ) : (
              <div className="overflow-x-auto border border-ink bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="p-3">Item</th>
                      <th scope="col" className="p-3 text-right">Qty</th>
                      <th scope="col" className="p-3 text-right">Unit price</th>
                      <th scope="col" className="p-3 text-right">Discount</th>
                      <th scope="col" className="p-3 text-right">Tax %</th>
                      <th scope="col" className="p-3 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, index) => (
                      <tr key={index} className="border-b border-accent last:border-b-0">
                        <td className="p-3">{line.description || "—"}</td>
                        <td className="p-3 text-right">{line.quantity || "—"}</td>
                        <td className="p-3 text-right">{fmt(line.unitPrice, moneyFormat)}</td>
                        <td className="p-3 text-right">{line.discount && !isZeroMoney(line.discount) ? fmt(line.discount, moneyFormat) : "—"}</td>
                        <td className="p-3 text-right">{line.taxPercent || "—"}</td>
                        <td className="p-3 text-right font-medium">{fmt(line.total, moneyFormat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totals.length > 0 ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {totals.map((row) => (
                  <div key={row.label} className="border border-ink bg-surface p-3">
                    <dt className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">{row.label}</dt>
                    <dd className={row.strong ? "mt-1 font-headline text-lg font-bold text-ink" : "mt-1 text-sm text-ink"}>{fmt(row.value, moneyFormat)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="mt-2 text-xs text-muted">All amounts are calculated by the server.</p>
          </Section>

          {draft ? (
            <Section title="Draft">
              <DraftTools
                invoiceId={id}
                initialLines={linesToDrafts(invoice.lines)}
                services={services.options}
                canEdit={can(p, "billing.invoice.create")}
                canIssue={can(p, "billing.invoice.issue")}
                canDiscount={can(p, "billing.discount.apply")}
                canCustom={can(p, "billing.service.manage")}
              />
            </Section>
          ) : null}

          {!draft ? (
            <Section title="Payments">
              <div className="flex flex-col gap-6">
                <PaymentsList payments={invoice.payments} canReverse={can(p, "billing.payment.reverse")} moneyFormat={moneyFormat} timezone={now.timezone} />
                {payable && can(p, "billing.payment.record") ? (
                  <PaymentForm invoiceId={id} balance={invoice.balance} moneyFormat={moneyFormat} />
                ) : null}
              </div>
            </Section>
          ) : null}

          {invoice.status === "issued" && can(p, "billing.invoice.cancel") ? (
            <Section title="Cancel">
              <div className="flex flex-wrap items-center justify-between gap-4 border border-ink bg-surface p-6">
                <p className="max-w-xl text-sm text-muted">An issued invoice is never deleted. It can be cancelled with a reason, only while it has no active payment.</p>
                <CancelInvoice invoiceId={id} />
              </div>
            </Section>
          ) : null}
        </div>
      </div>

      {/* The paper version (A4). Only this prints. */}
      <div className="hidden print:block">
        <InvoiceSheet
          invoice={invoice}
          hospital={hospital}
          serviceIndex={serviceIndex}
          moneyFormat={moneyFormat}
          timezone={now.timezone}
          today={now.today}
          printedBy={session.name}
          printedAt={`${formatLocalDate(now.today)}, ${now.time}`}
        />
      </div>
    </>
  );
}
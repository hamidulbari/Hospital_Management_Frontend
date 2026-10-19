import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { readInvoiceFilters } from "@/features/billing/filters";
import { InvoiceFilters } from "@/features/billing/invoice-filters";
import { fmt } from "@/features/billing/money-format";
import { INVOICE_STATUS_OPTIONS, invoiceTone } from "@/features/billing/options";
import { parseInvoiceList } from "@/features/billing/parse";
import { loadMoneyFormat } from "@/features/billing/server";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { showInstant } from "@/lib/format-instant";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 20;

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "billing.invoice.view")) {
    if (can(p, "billing.service.view")) redirect("/billing/services");
    if (can(p, "billing.statement.view")) redirect("/billing/statement");
    return <NoAccess />;
  }

  const [now, moneyFormat] = await Promise.all([hospitalNow(), loadMoneyFormat()]);
  const filters = readInvoiceFilters(await searchParams, INVOICE_STATUS_OPTIONS.map((o) => o.value));
  const result = await apiLoad<unknown>("/billing/invoices", {
    query: { date: filters.date, status: filters.status, per_page: PAGE_SIZE, page: filters.page },
  });
  const list = result.ok ? parseInvoiceList(result.data) : null;

  return (
    <>
      <PageHeader
        title="Invoices"
        description={filters.date ? `Created on ${formatLocalDate(filters.date)}` : "The newest invoices, newest first"}
        actions={can(p, "billing.invoice.create") ? <LinkButton href="/billing/new">New invoice</LinkButton> : undefined}
      />
      <InvoiceFilters date={filters.date} status={filters.status} />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No invoices" description="Nothing matches these filters. Change them, or create a new invoice." />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Invoice</th>
                  <th scope="col" className="p-3">Patient</th>
                  <th scope="col" className="p-3">Created</th>
                  <th scope="col" className="p-3 text-right">Total</th>
                  <th scope="col" className="p-3 text-right">Balance</th>
                  <th scope="col" className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                    <td className="p-3">
                      {/* prefetch off: opening an invoice is an audited read. */}
                      <Link href={`/billing/${invoice.id}`} prefetch={false} className="font-medium underline">
                        {invoice.number || (invoice.status === "draft" ? "Draft" : "\u2014")}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{invoice.patientName || "\u2014"}</p>
                      <p className="text-xs text-muted">MRN {invoice.patientMrn || "\u2014"}</p>
                    </td>
                    <td className="p-3 text-muted">{showInstant(invoice.date, now.timezone) || "\u2014"}</td>
                    <td className="p-3 text-right font-medium">{fmt(invoice.total, moneyFormat)}</td>
                    <td className="p-3 text-right">{fmt(invoice.balance, moneyFormat)}</td>
                    <td className="p-3">
                      <StatusBadge label={labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} tone={invoiceTone(invoice.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}

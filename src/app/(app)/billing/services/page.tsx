import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { UrlPagination } from "@/components/ui/url-pagination";
import { SERVICE_CATEGORY_OPTIONS } from "@/features/billing/options";
import { parseServices } from "@/features/billing/parse";
import { ServiceFilters } from "@/features/billing/service-filters";
import { ServicesTable } from "@/features/billing/services-table";
import { loadMoneyFormat } from "@/features/billing/server";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 50;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "billing.service.view")) return <NoAccess />;

  const raw = await searchParams;
  const q = first(raw.q).slice(0, 100);
  const category = SERVICE_CATEGORY_OPTIONS.some((o) => o.value === first(raw.category)) ? first(raw.category) : "";
  const active = ["true", "false"].includes(first(raw.active)) ? first(raw.active) : "";
  const pageNumber = Number(first(raw.page));
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 10_000 ? pageNumber : 1;

  const [result, moneyFormat] = await Promise.all([
    apiLoad<unknown>("/billing/services", { query: { q, category, active, per_page: PAGE_SIZE, page } }),
    loadMoneyFormat(),
  ]);
  const list = result.ok ? parseServices(result.data) : null;

  return (
    <>
      <PageHeader title="Price list" description="Services and their prices. A price change only affects invoices created afterwards." />
      <ServiceFilters q={q} category={category} active={active} />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 && !can(p, "billing.service.manage") ? (
        <EmptyState title="No services" description="No service matches these filters." />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <ServicesTable items={list.items} canManage={can(p, "billing.service.manage")} moneyFormat={moneyFormat} />
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}
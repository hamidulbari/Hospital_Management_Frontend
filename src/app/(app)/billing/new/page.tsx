import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { NewInvoiceForm } from "@/features/billing/new-invoice-form";
import { loadMoneyFormat, loadServiceOptions } from "@/features/billing/server";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function NewInvoicePage() {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "billing.invoice.create")) return <NoAccess />;

  const moneyFormat = await loadMoneyFormat();
  const services = can(p, "billing.service.view") ? await loadServiceOptions(moneyFormat) : { options: [], error: null };

  return (
    <>
      <PageHeader title="New invoice" description="Choose the patient, then the services. Prices come from the price list." />
      {services.error ? (
        <div className="mb-6">
          <ErrorNotice error={services.error} />
        </div>
      ) : null}
      <NewInvoiceForm services={services.options} canDiscount={can(p, "billing.discount.apply")} canCustom={can(p, "billing.service.manage")} />
    </>
  );
}
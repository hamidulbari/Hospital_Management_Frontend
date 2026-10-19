"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { labelFor } from "@/features/patients/options";
import { fmt, type MoneyFormat } from "./money-format";
import { SERVICE_CATEGORY_OPTIONS } from "./options";
import type { ServiceItem } from "./parse";
import { ServiceDialog, type ServiceTarget } from "./service-dialog";

export function ServicesTable({ items, canManage, moneyFormat }: { items: ServiceItem[]; canManage: boolean; moneyFormat: MoneyFormat }) {
  const router = useRouter();
  const [target, setTarget] = useState<ServiceTarget>(null);

  return (
    <>
      {canManage ? (
        <div className="mb-4">
          <Button onClick={() => setTarget("new")}>Add service</Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted">No services match these filters.</p>
      ) : (
        <div className="overflow-x-auto border border-ink bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-3">Code</th>
                <th scope="col" className="p-3">Name</th>
                <th scope="col" className="p-3">Category</th>
                <th scope="col" className="p-3 text-right">Unit price</th>
                <th scope="col" className="p-3 text-right">Tax %</th>
                <th scope="col" className="p-3">Status</th>
                {canManage ? <th scope="col" className="p-3"><span className="sr-only">Edit</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((service) => (
                <tr key={service.id} className="border-b border-accent last:border-b-0 hover:bg-accent">
                  <td className="p-3 font-medium">{service.code}</td>
                  <td className="p-3">{service.name}</td>
                  <td className="p-3">{service.category ? labelFor(SERVICE_CATEGORY_OPTIONS, service.category) : "—"}</td>
                  <td className="p-3 text-right font-medium">{fmt(service.unitPrice, moneyFormat)}</td>
                  <td className="p-3 text-right">{service.taxPercent || "—"}</td>
                  <td className="p-3">
                    <StatusBadge label={service.active ? "Active" : "Inactive"} tone={service.active ? "active" : "muted"} />
                  </td>
                  {canManage ? (
                    <td className="p-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setTarget(service)}>Edit</Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServiceDialog
        target={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          router.refresh();
        }}
      />
    </>
  );
}
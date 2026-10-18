"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { can, type PermissionCode } from "@/lib/permissions";

const PermissionsContext = createContext<readonly string[]>([]);

export function PermissionsProvider({ permissions, children }: { permissions: readonly string[]; children: ReactNode }) {
  return <PermissionsContext.Provider value={permissions}>{children}</PermissionsContext.Provider>;
}

/** Client side: const can = useCan(); can("billing.discount.apply") */
export function useCan() {
  const permissions = useContext(PermissionsContext);
  return useMemo(() => (code: PermissionCode) => can(permissions, code), [permissions]);
}
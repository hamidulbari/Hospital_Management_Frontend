import clsx from "clsx";
import type { ReactNode } from "react";
import type { ClientError } from "@/lib/api/errors";

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "border border-l-4 bg-surface p-4 text-sm",
        tone === "error" ? "border-error text-error" : "border-primary-dark text-primary-dark",
      )}
    >
      {children}
    </div>
  );
}

export function ErrorNotice({ error }: { error: Pick<ClientError, "message" | "correlationId" | "unexpected"> }) {
  return (
    <Notice tone="error">
      <p className="font-medium">{error.message}</p>
      {error.unexpected && error.correlationId ? (
        <p className="mt-1 text-xs">Reference: {error.correlationId}</p>
      ) : null}
    </Notice>
  );
}
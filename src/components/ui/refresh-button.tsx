"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "./button";

/** Manual refresh only. Lists that show patient names are audited, so they are never polled. */
export function RefreshButton({ updatedAt }: { updatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" loading={pending} onClick={() => startTransition(() => router.refresh())}>
        Refresh
      </Button>
      <p className="text-xs text-muted">Updated {updatedAt}</p>
    </div>
  );
}
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useNavigationProgress } from "./navigation-progress";
import { Pagination } from "./pagination";

/** Pagination whose page lives in the URL (?page=). Only for pages whose other params are not patient data. */
export function UrlPagination({ page, lastPage, total, pageSize }: { page: number; lastPage: number; total: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();

  function go(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set("page", String(next));
    progress.start();
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return <Pagination page={page} lastPage={lastPage} total={total} pageSize={pageSize} disabled={pending} onPageChange={go} />;
}
"use client";

import clsx from "clsx";
import { pageItems } from "@/lib/pagination";
import { Button } from "./button";

type Props = {
  page: number;
  lastPage: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, lastPage, total, pageSize, disabled = false, onPageChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-4 text-sm">
      <p className="text-muted">
        Showing {from}–{to} of {total}
      </p>
      {lastPage > 1 ? (
        <ul className="flex flex-wrap items-center gap-1">
          <li>
            <Button variant="secondary" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
          </li>
          {pageItems(page, lastPage).map((item, index) =>
            item === "gap" ? (
              <li key={`gap-${index}`} aria-hidden="true" className="px-2 text-muted">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  disabled={disabled}
                  onClick={() => (item === page ? undefined : onPageChange(item))}
                  className={clsx(
                    "h-10 min-w-10 border px-3 text-sm font-semibold disabled:cursor-not-allowed",
                    item === page ? "border-ink bg-ink text-white" : "border-ink bg-surface text-ink hover:border-primary hover:bg-accent",
                  )}
                >
                  {item}
                </button>
              </li>
            ),
          )}
          <li>
            <Button variant="secondary" disabled={disabled || page >= lastPage} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
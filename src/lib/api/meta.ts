import { num, rec } from "@/lib/utils/guards";

export type PageInfo = { currentPage: number; lastPage: number; total: number };

export function parsePage(body: unknown, fallbackTotal: number): PageInfo {
  const meta = rec(rec(body).meta);
  return {
    currentPage: num(meta.current_page) ?? 1,
    lastPage: num(meta.last_page) ?? 1,
    total: num(meta.total) ?? fallbackTotal,
  };
}
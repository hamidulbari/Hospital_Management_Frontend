export type PageItem = number | "gap";

/** Page buttons to show: always the first and last page, the current one and its neighbours, "gap" for skipped runs. */
export function pageItems(current: number, last: number): PageItem[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);

  const pages = new Set<number>([1, last, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= last - 2) [last - 1, last - 2, last - 3].forEach((page) => pages.add(page));

  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((page, index) => {
    if (index > 0) {
      const difference = page - sorted[index - 1];
      if (difference === 2) items.push(page - 1); // one missing page: show it instead of a gap
      else if (difference > 2) items.push("gap");
    }
    items.push(page);
  });
  return items;
}
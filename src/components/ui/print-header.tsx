/** The heading of a printout. Hidden on screen, shown on paper. */
export function PrintHeader({ organization, title, lines }: { organization: string; title: string; lines: string[] }) {
  return (
    <div className="hidden print:mb-2 print:block">
      <p className="font-headline text-base font-bold uppercase tracking-wider text-ink">{organization}</p>
      <p className="mt-2 font-headline text-3xl font-bold text-ink">{title}</p>
      <div className="mt-3 flex flex-col gap-1">
        {lines.map((line) => (
          <p key={line} className="text-sm text-ink">
            {line}
          </p>
        ))}
      </div>
      <hr className="mt-5 border-ink" />
    </div>
  );
}
import clsx from "clsx";

/** The five section colours side by side. Decoration only. */
export function SectionStripe({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={clsx("flex h-1.5 w-full", className)}>
      <span className="flex-1 bg-teal-700" />
      <span className="flex-1 bg-sky-700" />
      <span className="flex-1 bg-violet-700" />
      <span className="flex-1 bg-amber-700" />
      <span className="flex-1 bg-pink-700" />
    </div>
  );
}
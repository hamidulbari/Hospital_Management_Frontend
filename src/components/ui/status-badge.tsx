import clsx from "clsx";

export type BadgeTone = "neutral" | "active" | "strong" | "info" | "bad" | "muted";

// Each tone has its own colour. The label always says what it is, colour is never the only sign.
const tones: Record<BadgeTone, string> = {
  neutral: "border-amber-300 bg-amber-100 text-amber-950",
  active: "border-emerald-300 bg-emerald-100 text-emerald-950",
  strong: "border-sky-700 bg-sky-700 text-white",
  info: "border-violet-700 bg-violet-700 text-white",
  muted: "border-slate-300 bg-slate-200 text-slate-800",
  bad: "border-red-300 bg-red-100 text-red-900",
};

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={clsx("inline-block border px-2 py-1 font-headline text-xs font-semibold uppercase tracking-wider", tones[tone])}>
      {label}
    </span>
  );
}
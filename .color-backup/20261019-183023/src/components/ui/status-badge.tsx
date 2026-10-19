import clsx from "clsx";

export type BadgeTone = "neutral" | "active" | "strong" | "info" | "bad" | "muted";

const tones: Record<BadgeTone, string> = {
  neutral: "border-ink text-ink",
  active: "border-accent bg-accent text-ink",
  strong: "border-ink bg-ink text-white",
  info: "border-primary bg-primary text-white",
  muted: "border-muted text-muted",
  bad: "border-error text-error",
};

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={clsx("inline-block border px-2 py-1 font-headline text-xs font-semibold uppercase tracking-wider", tones[tone])}>
      {label}
    </span>
  );
}
"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import clsx from "clsx";

type Props = { open: boolean; title: string; onClose: () => void; size?: "md" | "lg"; children: ReactNode };

/** Native <dialog>. The content is mounted only while open, so its state resets on every open. */
export function Modal({ open, title, onClose, size = "md", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className={clsx(
        "m-auto w-full border border-ink bg-surface p-6 text-ink backdrop:bg-black/40",
        size === "lg" ? "max-w-3xl" : "max-w-md",
      )}
    >
      <h2 id={titleId} className="font-headline text-lg font-bold">{title}</h2>
      {open ? <div className="mt-4">{children}</div> : null}
    </dialog>
  );
}
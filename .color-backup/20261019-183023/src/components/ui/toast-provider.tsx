"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { ClientError } from "@/lib/api/errors";

type Tone = "success" | "error";
type ToastItem = { id: number; tone: Tone; message: string; reference: string | null };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string, reference?: string | null) => void;
  /** Shows an API error. The reference id is added for unexpected errors only. */
  fromError: (error: ClientError, options?: { useFieldMessage?: boolean }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 4;
const DURATION_MS = { success: 4000, error: 9000 } as const;

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(item.id), DURATION_MS[item.tone]);
    return () => window.clearTimeout(timer);
  }, [paused, item.id, item.tone, onDismiss]);

  const isError = item.tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={clsx(
        "pointer-events-auto flex items-start gap-3 border border-l-8 p-4 text-sm text-ink",
        isError ? "border-error bg-surface" : "border-ink bg-accent",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={clsx("font-headline text-xs font-bold uppercase tracking-wider", isError ? "text-error" : "text-ink")}>
          {isError ? "Not done" : "Done"}
        </p>
        <p className="mt-1 break-words">{item.message}</p>
        {item.reference ? <p className="mt-1 text-xs text-muted">Reference: {item.reference}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none text-ink hover:text-primary"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((tone: Tone, message: string, reference: string | null) => {
    const id = nextId.current++;
    setItems((list) => {
      // The same message again replaces the old one instead of piling up.
      const rest = list.filter((toast) => !(toast.tone === tone && toast.message === message));
      return [...rest, { id, tone, message, reference }].slice(-MAX_VISIBLE);
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message, null),
      error: (message, reference = null) => push("error", message, reference),
      fromError: (error, options) => {
        const message = options?.useFieldMessage
          ? (Object.values(error.fieldErrors)[0] ?? error.message)
          : error.message;
        push("error", message, error.unexpected ? error.correlationId : null);
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
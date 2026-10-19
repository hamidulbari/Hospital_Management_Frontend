"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Phase = "idle" | "running" | "finishing";

const ProgressContext = createContext<{ start: () => void }>({ start: () => {} });

/** Call start() right before a navigation that is not a plain link (router.push from filters or pagination). */
export function useNavigationProgress() {
  return useContext(ProgressContext);
}

const GIVE_UP_AFTER_MS = 15_000;

export function NavigationProgress({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [width, setWidth] = useState(0);
  const startHref = useRef("");
  const startedAt = useRef(0);

  const start = useCallback(() => {
    startHref.current = window.location.href;
    startedAt.current = Date.now();
    setWidth(8);
    setPhase("running");
  }, []);

  // While running: creep towards 90%, and finish as soon as the address changes (Next changes it when the new page is ready).
  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => {
      if (window.location.href !== startHref.current || Date.now() - startedAt.current > GIVE_UP_AFTER_MS) {
        setWidth(100);
        setPhase("finishing");
        return;
      }
      setWidth((current) => current + (90 - current) * 0.12);
    }, 120);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "finishing") return;
    const timer = window.setTimeout(() => {
      setPhase("idle");
      setWidth(0);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Plain links: start on click. Capture phase, because Next's own handler cancels the default action.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  const api = useMemo(() => ({ start }), [start]);

  return (
    <ProgressContext.Provider value={api}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
        <div
          className="h-full bg-primary"
          style={{
            width: `${width}%`,
            opacity: phase === "running" ? 1 : 0,
            transition: phase === "idle" ? "none" : "width 200ms ease-out, opacity 300ms ease 100ms",
          }}
        />
      </div>
      <p role="status" className="sr-only">{phase === "running" ? "Loading page" : ""}</p>
      {children}
    </ProgressContext.Provider>
  );
}
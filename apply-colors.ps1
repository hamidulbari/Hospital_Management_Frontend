$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath 'package.json') -or -not (Test-Path -LiteralPath 'src/app')) {
  throw 'Run this inside the frontend folder (the one with package.json and src).'
}
$root = (Get-Location).Path
$backup = Join-Path $root ('.color-backup\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$utf8 = New-Object System.Text.UTF8Encoding($false)
$written = New-Object System.Collections.ArrayList

function Save-File([string]$rel, [string]$text) {
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  if (Test-Path -LiteralPath $full) {
    $copy = [System.IO.Path]::GetFullPath((Join-Path $backup $rel))
    New-Item -ItemType Directory -Force -Path (Split-Path $copy) | Out-Null
    Copy-Item -LiteralPath $full -Destination $copy -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [System.IO.File]::WriteAllText($full, $text, $utf8)
  [void]$written.Add($rel)
}

Save-File 'src/app/globals.css' @'
@import "tailwindcss";

@theme inline {
  --color-primary: #0284c7;
  --color-primary-dark: #075985;
  --color-background: #f0f9ff;
  --color-surface: #ffffff;
  --color-accent: #bae6fd;
  --color-ink: #0f172a;
  --color-muted: #475569;
  --color-error: #b91c1c;
  /* The colour of the part of the app you are in. Set by data-section (see below). */
  --color-section: var(--section);
  --color-section-soft: var(--section-soft);
  --color-section-ink: var(--section-ink);
  --font-headline: var(--font-public-sans), ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  /* Default (login, anything without a section): black. */
  :root {
    --section: #0f172a;
    --section-soft: #bae6fd;
    --section-ink: #0f172a;
  }
  /* One colour per part of the app. White text on --section passes 4.5:1, dark text on --section-soft passes too. */
  [data-section="dashboard"] {
    --section: #075985;
    --section-soft: #bae6fd;
    --section-ink: #0c4a6e;
  }
  [data-section="patients"] {
    --section: #0f766e;
    --section-soft: #ccfbf1;
    --section-ink: #134e4a;
  }
  [data-section="appointments"] {
    --section: #0369a1;
    --section-soft: #e0f2fe;
    --section-ink: #0c4a6e;
  }
  [data-section="consultation"] {
    --section: #6d28d9;
    --section-soft: #ede9fe;
    --section-ink: #4c1d95;
  }
  [data-section="billing"] {
    --section: #b45309;
    --section-soft: #fef3c7;
    --section-ink: #78350f;
  }
  [data-section="admin"] {
    --section: #be185d;
    --section-soft: #fce7f3;
    --section-ink: #831843;
  }

  /* Swiss style safety net: no rounding, no shadows anywhere. */
  *,
  *::before,
  *::after {
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  /* Blue only appears on a trigger. Focus is one. */
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

/* Every table header takes the soft colour of its section. */
main thead {
  background-color: var(--section-soft);
}

/* Hide the browser's own reveal button: we draw ours. */
input::-ms-reveal,
input::-ms-clear {
  display: none;
}

/* A new page fades in a little. */
@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.page-enter {
  animation: page-in 160ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter,
  .animate-pulse {
    animation: none;
  }
}

/* Paper: A4, with a margin on every side. */
@page {
  size: A4;
  margin: 14mm 14mm 16mm;
}

/*
  Printing: a page prints its own "sheet" (a block marked "hidden print:block").
  The screen version of the page is marked "print:hidden", and the shell around it is hidden here.
*/
@media print {
  aside,
  nav[aria-label],
  header.sticky,
  .fixed,
  dialog,
  button,
  [data-no-print] {
    display: none !important;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body,
  main {
    background: #ffffff !important;
  }
  main {
    padding: 0 !important;
  }
  main > div {
    max-width: none !important;
  }
  main thead {
    background: transparent !important;
  }
  .page-enter {
    animation: none !important;
  }
  a {
    color: inherit !important;
    text-decoration: none !important;
  }
  table {
    border-collapse: collapse;
  }
  tr,
  section,
  article {
    break-inside: avoid;
  }
}
'@

Save-File 'src/lib/sections.ts' @'
export type SectionKey = "dashboard" | "patients" | "appointments" | "consultation" | "billing" | "admin";

const BY_FIRST_SEGMENT: Record<string, SectionKey> = {
  patients: "patients",
  appointments: "appointments",
  consultation: "consultation",
  billing: "billing",
  admin: "admin",
};

/** The part of the app a path belongs to. It decides the colour. Anything unknown is the dashboard. */
export function sectionFor(pathname: string): SectionKey {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  return BY_FIRST_SEGMENT[first] ?? "dashboard";
}
'@

Save-File 'src/lib/sections.test.ts' @'
import { describe, expect, it } from "vitest";
import { sectionFor } from "./sections";

describe("sectionFor", () => {
  it("names the part of the app from the first segment", () => {
    expect(sectionFor("/")).toBe("dashboard");
    expect(sectionFor("/patients")).toBe("patients");
    expect(sectionFor("/patients/01m59qf0j57gndns5818ahgraf")).toBe("patients");
    expect(sectionFor("/appointments/queue")).toBe("appointments");
    expect(sectionFor("/consultation/abc")).toBe("consultation");
    expect(sectionFor("/billing/statement")).toBe("billing");
    expect(sectionFor("/admin/practitioners")).toBe("admin");
  });
  it("falls back to the dashboard", () => {
    expect(sectionFor("/change-password")).toBe("dashboard");
    expect(sectionFor("")).toBe("dashboard");
  });
});
'@

Save-File 'src/components/ui/section-stripe.tsx' @'
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
'@

Save-File 'src/components/ui/button.tsx' @'
import clsx from "clsx";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "md" | "sm";
type Props = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean };

const styles: Record<ButtonVariant, string> = {
  // The main button takes the colour of the part of the app (black where there is none).
  primary: "border-section bg-section text-white hover:border-ink hover:bg-ink",
  secondary: "border-ink bg-surface text-ink hover:border-section hover:bg-section-soft",
  danger: "border-error bg-error text-white hover:bg-surface hover:text-error",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

export function buttonClasses(variant: ButtonVariant = "primary", className?: string, size: ButtonSize = "md") {
  return clsx(
    "inline-flex items-center justify-center border font-semibold disabled:cursor-not-allowed disabled:opacity-50",
    sizes[size],
    styles[variant],
    className,
  );
}

export function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, className, size)} {...rest}>
      {loading ? "Please wait\u2026" : children}
    </button>
  );
}
'@

Save-File 'src/components/ui/status-badge.tsx' @'
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
'@

Save-File 'src/components/ui/tabs-nav.tsx' @'
"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabsNav({ items, label }: { items: { label: string; href: string }[]; label: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label={label} className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "border px-4 py-2 text-sm font-semibold",
              active ? "border-section bg-section text-white" : "border-ink bg-surface text-ink hover:border-section hover:bg-section-soft",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
'@

Save-File 'src/components/ui/page-header.tsx' @'
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-t-4 border-ink border-t-section pb-4 pt-4">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
'@

Save-File 'src/components/ui/section.tsx' @'
import type { ReactNode } from "react";

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-ink pt-4 print:border-t-0 print:pt-0">
      <div className="mb-4 flex items-center justify-between gap-4 print:mb-3 print:border-b print:border-ink print:pb-2">
        <h2 className="flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wider text-ink">
          <span aria-hidden="true" className="inline-block h-3 w-3 bg-section print:hidden" />
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
'@

Save-File 'src/components/ui/empty-state.tsx' @'
import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="border border-t-4 border-ink border-t-section bg-surface p-10">
      <h2 className="font-headline text-lg font-bold text-ink">{title}</h2>
      {description ? <p className="mt-2 max-w-prose text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
'@

Save-File 'src/components/ui/pagination.tsx' @'
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
        Showing {from}&ndash;{to} of {total}
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
                &hellip;
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
                    item === page ? "border-section bg-section text-white" : "border-ink bg-surface text-ink hover:border-section hover:bg-section-soft",
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
'@

Save-File 'src/components/ui/toast-provider.tsx' @'
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
        isError ? "border-error bg-red-50" : "border-emerald-700 bg-emerald-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={clsx("font-headline text-xs font-bold uppercase tracking-wider", isError ? "text-error" : "text-emerald-900")}>
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
        &times;
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
'@

Save-File 'src/components/layout/sidebar-nav.tsx' @'
"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sectionFor } from "@/lib/sections";

export type SidebarItem = { label: string; href: string; ready: boolean };

export function SidebarNav({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const section = sectionFor(item.href); // each item carries its own colour

          if (!item.ready) {
            return (
              <li key={item.href}>
                <span aria-disabled="true" className="flex items-center justify-between border-l-4 border-transparent px-3 py-2 text-sm text-muted">
                  {item.label}
                  <span className="font-headline text-[10px] uppercase tracking-wider">Soon</span>
                </span>
              </li>
            );
          }
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                data-section={section}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 border-l-4 px-3 py-2 text-sm font-medium text-ink",
                  active ? "border-section bg-section-soft" : "border-transparent hover:bg-section-soft",
                )}
              >
                <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 bg-section" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
'@

Save-File 'src/components/layout/app-shell.tsx' @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { SectionStripe } from "@/components/ui/section-stripe";
import { sectionFor } from "@/lib/sections";
import { SidebarNav, type SidebarItem } from "./sidebar-nav";

type User = { name: string; email: string };

function UserBlock({ user }: { user: User }) {
  return (
    <div className="text-sm">
      <p className="font-medium text-ink">{user.name}</p>
      <p className="break-all text-xs text-muted">{user.email}</p>
      <div className="mt-3 flex flex-col gap-2">
        <Link href="/change-password" className="font-medium text-ink underline hover:text-primary">
          Change password
        </Link>
        <form action="/api/auth/logout" method="post">
          <Button type="submit" variant="secondary" className="w-full">Sign out</Button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({ items, user, children }: { items: SidebarItem[]; user: User; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  // The menu is "open for this page". Moving to another page closes it by itself.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* A thin line of the five colours across the very top. */}
      <SectionStripe className="fixed inset-x-0 top-0 z-50 h-1" />

      {/* Phone and small tablet: a top bar with a Menu button. */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-ink bg-surface px-4 pt-1 md:hidden">
        <p className="font-headline text-xl font-bold tracking-tight text-ink">HMS</p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? "mobile-menu" : undefined}
          onClick={() => setOpenPath(open ? null : pathname)}
          className="h-10 border border-ink px-4 text-sm font-semibold text-ink hover:border-primary hover:bg-accent"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      {open ? (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col overflow-y-auto bg-surface md:hidden">
          <div className="flex-1 p-3">
            <SidebarNav items={items} />
          </div>
          <div className="border-t border-ink p-4">
            <UserBlock user={user} />
          </div>
        </div>
      ) : null}

      {/* Wide screens: fixed sidebar. Only the menu in the middle scrolls, so Sign out is always visible. */}
      <aside className="hidden border-ink bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:self-start md:border-r">
        <div className="shrink-0 border-b border-ink p-6 pt-7">
          <p className="font-headline text-2xl font-bold tracking-tight text-ink">HMS</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} />
        </div>
        <div className="shrink-0 border-t border-ink p-4">
          <UserBlock user={user} />
        </div>
      </aside>

      {/* data-section sets the colour of everything inside: buttons, tabs, headings, table headers. */}
      <main id="main" data-section={sectionFor(pathname)} className="min-w-0 flex-1 bg-background p-4 pt-6 sm:p-6 md:p-10">
        {/* Content stays next to the sidebar and stops growing on very wide screens. */}
        <div className="w-full max-w-[1400px]">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
}
'@

Save-File 'src/features/dashboard/widgets.tsx' @'
import clsx from "clsx";
import type { ReactNode } from "react";

export type Tone = "ink" | "sky" | "teal" | "violet" | "amber" | "emerald" | "red" | "pink";

// Full class names on purpose: the colours must be visible to Tailwind.
const FILL: Record<Tone, string> = {
  ink: "bg-ink",
  sky: "bg-sky-600",
  teal: "bg-teal-600",
  violet: "bg-violet-600",
  amber: "bg-amber-500",
  emerald: "bg-emerald-600",
  red: "bg-red-600",
  pink: "bg-pink-600",
};

const TOP: Record<Tone, string> = {
  ink: "border-t-ink",
  sky: "border-t-sky-600",
  teal: "border-t-teal-600",
  violet: "border-t-violet-600",
  amber: "border-t-amber-500",
  emerald: "border-t-emerald-600",
  red: "border-t-red-600",
  pink: "border-t-pink-600",
};

export function SampleBadge() {
  return (
    <span className="border border-ink bg-surface px-2 py-1 font-headline text-[10px] font-semibold uppercase tracking-wider text-ink">
      Sample data
    </span>
  );
}

export function Panel({ title, sample = false, tone, className, children }: { title: string; sample?: boolean; tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <section className={clsx("border border-ink bg-surface", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-ink bg-section-soft px-5 py-3">
        <h2 className="flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wider text-ink">
          <span aria-hidden="true" className={clsx("inline-block h-3 w-3", tone ? FILL[tone] : "bg-section")} />
          {title}
        </h2>
        {sample ? <SampleBadge /> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, caption, tone = "sky" }: { label: string; value: string; caption: string; tone?: Tone }) {
  return (
    <div className={clsx("border border-t-4 border-ink bg-surface p-5", TOP[tone])}>
      <p className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-4 whitespace-nowrap font-headline text-4xl font-bold leading-none tracking-tight text-ink">{value}</p>
      <p className="mt-3 text-xs text-muted">{caption}</p>
    </div>
  );
}

/** Horizontal bars. The width is relative to the largest row. */
export function BarList({ rows }: { rows: { label: string; value: number; display?: string; tone?: Tone }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">{row.label}</span>
            <span className="font-headline font-bold text-ink">{row.display ?? row.value}</span>
          </div>
          <div aria-hidden="true" className="mt-1 h-2 bg-background">
            <div className={clsx("h-full", FILL[row.tone ?? "ink"])} style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars with the value above and the label below. Today's bar is violet. */
export function ColumnChart({ columns }: { columns: { label: string; value: number; highlight?: boolean }[] }) {
  const max = Math.max(1, ...columns.map((column) => column.value));
  return (
    <ul className="flex h-52 items-stretch gap-3">
      {columns.map((column) => (
        <li key={column.label} className="flex flex-1 flex-col text-center">
          <span className="mb-1 text-xs font-semibold text-ink">{column.value}</span>
          <div className="flex flex-1 items-end">
            <div
              aria-hidden="true"
              className={clsx("w-full", column.highlight ? "bg-violet-600" : "bg-sky-600")}
              style={{ height: `${Math.max(2, Math.round((column.value / max) * 100))}%` }}
            />
          </div>
          <span className={clsx("mt-2 text-xs", column.highlight ? "font-semibold text-ink" : "text-muted")}>{column.label}</span>
        </li>
      ))}
    </ul>
  );
}
'@

Save-File 'src/features/dashboard/quick-actions.tsx' @'
import Link from "next/link";
import { can, type PermissionCode } from "@/lib/permissions";
import type { SectionKey } from "@/lib/sections";

type Action = { label: string; description: string; href: string; permission: PermissionCode; section: SectionKey; ready: boolean };

const ACTIONS: Action[] = [
  { label: "Search patient", description: "By name, phone or MRN", href: "/patients", permission: "patient.view", section: "patients", ready: true },
  { label: "Register patient", description: "New patient record", href: "/patients/new", permission: "patient.register", section: "patients", ready: true },
  { label: "Book appointment", description: "Doctor, date and slot", href: "/appointments/new", permission: "appointment.book", section: "appointments", ready: true },
  { label: "Walk-in", description: "Patient without a booking", href: "/appointments/walk-in", permission: "appointment.book", section: "appointments", ready: true },
  { label: "Today's appointments", description: "Check in, cancel, reschedule", href: "/appointments", permission: "appointment.view", section: "appointments", ready: true },
  { label: "OPD queue", description: "Tokens and who is waiting", href: "/appointments/queue", permission: "appointment.view", section: "appointments", ready: true },
  { label: "New invoice", description: "Bill a patient", href: "/billing/new", permission: "billing.invoice.create", section: "billing", ready: true },
];

export function QuickActions({ permissions }: { permissions: readonly string[] }) {
  const allowed = ACTIONS.filter((action) => can(permissions, action.permission));
  if (allowed.length === 0) return null;

  return (
    <section aria-label="Quick actions">
      <h2 className="mb-3 font-headline text-xs font-semibold uppercase tracking-wider text-muted">Quick actions</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {allowed.map((action) => (
          <li key={action.href}>
            {action.ready ? (
              <Link
                href={action.href}
                prefetch={false}
                data-section={action.section}
                className="flex h-full items-start justify-between gap-3 border border-t-4 border-ink border-t-section bg-surface p-4 hover:bg-section-soft"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{action.label}</span>
                  <span className="mt-1 block text-xs text-muted">{action.description}</span>
                </span>
                <span aria-hidden="true" className="font-headline text-lg text-section">&rarr;</span>
              </Link>
            ) : (
              <div aria-disabled="true" className="flex h-full items-start justify-between gap-3 border border-accent bg-surface p-4">
                <span>
                  <span className="block text-sm font-semibold text-muted">{action.label}</span>
                  <span className="mt-1 block text-xs text-muted">{action.description}</span>
                </span>
                <span className="font-headline text-[10px] font-semibold uppercase tracking-wider text-muted">Soon</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
'@

Save-File 'src/app/(app)/page.tsx' @'
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { loadDashboardData } from "@/features/dashboard/data";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { BarList, ColumnChart, KpiCard, Panel, SampleBadge, type Tone } from "@/features/dashboard/widgets";
import { requireSession } from "@/lib/auth/session";
import { weekdayName } from "@/lib/calendar";
import { formatLocalDate } from "@/lib/datetime";
import { getHospital, hospitalNow } from "@/lib/hospital";
import { formatMoney } from "@/lib/money";
import { can } from "@/lib/permissions";

function greeting(time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// The same status has the same colour everywhere on this screen. The label always says what it is.
const STATUS_TONES: Record<string, Tone> = {
  Booked: "sky",
  "Checked in": "teal",
  "In consultation": "violet",
  Completed: "emerald",
  Cancelled: "red",
  "No-show": "amber",
};
const METHOD_TONES: Record<string, Tone> = { Cash: "emerald", UPI: "violet", Card: "sky" };
const DOCTOR_TONES: Tone[] = ["teal", "sky", "violet", "pink", "amber"];

export default async function DashboardPage() {
  const session = await requireSession();
  const [now, hospital] = await Promise.all([hospitalNow(), getHospital()]);

  const showAppointments = can(session.permissions, "appointment.view");
  const showBilling = can(session.permissions, "billing.invoice.view");
  const data = showAppointments || showBilling ? await loadDashboardData(now.today) : null;

  const currency = hospital?.currencyCode || undefined;
  const grouping = currency === "INR" ? "indian" : "international";
  const money = (amount: string) => formatMoney(amount, { currency, grouping });
  const firstName = session.name.split(" ")[0] || session.name;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greeting(now.time)}, ${firstName}`}
        description={`${hospital?.name || "HMS"} \u00b7 ${weekdayName(now.today)}, ${formatLocalDate(now.today)}`}
      />

      <QuickActions permissions={session.permissions} />

      {data?.isSample ? (
        <Notice>
          <p className="font-medium">Design preview</p>
          <p className="mt-1">
            The figures below are sample data, not from the hospital. They will show real numbers once the summary is connected.
          </p>
        </Notice>
      ) : null}

      {data && showAppointments ? (
        <section aria-label="Today at a glance">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">Today at a glance</h2>
            {data.isSample ? <SampleBadge /> : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard tone="sky" label="Appointments today" value={String(data.kpis.appointmentsToday)} caption="All statuses" />
            <KpiCard tone="violet" label="In OPD queue" value={String(data.kpis.inQueue)} caption="Waiting or with a doctor" />
            <KpiCard tone="teal" label="Completed" value={String(data.kpis.completedToday)} caption="Consultations finished" />
            {showBilling ? (
              <KpiCard tone="amber" label="Collected today" value={money(data.kpis.collectedToday)} caption="Payments recorded today" />
            ) : null}
          </div>
        </section>
      ) : null}

      {data && showAppointments ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Panel title="Appointments, last 7 days" sample={data.isSample} tone="sky" className="lg:col-span-8">
            <ColumnChart columns={data.weekly} />
          </Panel>
          <Panel title="Today by status" sample={data.isSample} tone="violet" className="lg:col-span-4">
            <BarList rows={data.statusBreakdown.map((row) => ({ ...row, tone: STATUS_TONES[row.label] ?? "ink" }))} />
          </Panel>

          <Panel title="Coming up" sample={data.isSample} tone="teal" className="lg:col-span-7">
            <ul>
              {data.upcoming.map((item) => (
                <li key={`${item.time}-${item.patient}`} className="flex items-center gap-4 border-b border-accent py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="w-14 font-headline text-lg font-bold text-ink">{item.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.patient}</span>
                    <span className="block truncate text-xs text-muted">{item.doctor}</span>
                  </span>
                  <span className="text-xs text-muted">{item.type}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="OPD queue" sample={data.isSample} tone="violet" className="lg:col-span-5">
            <ul>
              {data.queue.map((item) => (
                <li key={item.token} className="flex items-center gap-4 border-b border-accent py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="w-12 font-headline text-3xl font-bold leading-none text-violet-700">{item.token}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.patient}</span>
                  <span className="text-xs text-muted">{item.status}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Doctor load today" sample={data.isSample} tone="pink" className={showBilling ? "lg:col-span-6" : "lg:col-span-12"}>
            <BarList rows={data.doctorLoad.map((row, index) => ({ ...row, tone: DOCTOR_TONES[index % DOCTOR_TONES.length] }))} />
          </Panel>

          {showBilling ? (
            <Panel title="Collection by method" sample={data.isSample} tone="amber" className="lg:col-span-6">
              <BarList
                rows={data.collectedByMethod.map((row) => ({
                  label: row.label,
                  value: row.share,
                  display: money(row.amount),
                  tone: METHOD_TONES[row.label] ?? "ink",
                }))}
              />
              <p className="mb-2 mt-6 font-headline text-xs font-semibold uppercase tracking-wider text-muted">Invoices today</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.invoiceCounts.map((item) => (
                  <li key={item.label} className="border border-ink bg-section-soft p-3">
                    <p className="font-headline text-2xl font-bold text-ink">{item.value}</p>
                    <p className="text-xs text-muted">{item.label}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
'@

Save-File 'src/app/(auth)/login/page.tsx' @'
import { LoginForm } from "@/features/auth/login-form";
import { Notice } from "@/components/ui/notice";
import { SectionStripe } from "@/components/ui/section-stripe";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-12">
      <section className="flex flex-col border-b border-ink bg-background text-ink md:col-span-7 md:border-b-0 md:border-r">
        <SectionStripe className="h-2" />
        <div className="flex flex-1 flex-col justify-between gap-16 p-8 md:p-16">
          <p className="font-headline text-xs font-semibold uppercase tracking-widest text-ink">Hospital Management System</p>
          <h1 className="font-headline text-7xl font-bold leading-none tracking-tight text-ink md:text-9xl">HMS</h1>
        </div>
      </section>
      <section className="flex items-center bg-surface p-8 md:col-span-5 md:p-16">
        <div className="w-full max-w-sm">
          <h2 className="font-headline text-2xl font-bold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your staff account.</p>
          {reason === "expired" ? (
            <div className="mt-6">
              <Notice>Your session has expired. Please sign in again.</Notice>
            </div>
          ) : null}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
'@

Write-Host ''
Write-Host ('Done. {0} files written.' -f $written.Count) -ForegroundColor Green
Write-Host ('Old copies of changed files: {0}' -f $backup)
Write-Host 'Next: npm run typecheck ; npm test ; npm run lint'
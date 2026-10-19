"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import clsx from "clsx";

export type SelectOption = { value: string; label: string; searchText?: string };

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** The search box appears when there are MORE options than this. */
  searchThreshold?: number;
  className?: string;
  popoverClassName?: string;
  ariaLabel?: string;
  renderOption?: (option: SelectOption) => ReactNode;
  renderValue?: (option: SelectOption) => ReactNode;
};

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true" className="shrink-0">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ListboxSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Choose…",
  onBlur,
  disabled,
  invalid,
  describedBy,
  searchThreshold = 10,
  className,
  popoverClassName,
  ariaLabel,
  renderOption,
  renderValue,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const searchable = options.filter((o) => o.value !== "").length > searchThreshold;
  const selected = options.find((o) => o.value === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return options;
    return options.filter((o) => o.value !== "" && `${o.label} ${o.searchText ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);

  const optionId = (index: number) => `${listId}-opt-${index}`;

  function openList() {
    setQuery("");
    const index = options.findIndex((o) => o.value === value);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  }

  function closeList(returnFocus: boolean) {
    setOpen(false);
    onBlur?.();
    if (returnFocus) triggerRef.current?.focus();
  }

  function choose(option: SelectOption) {
    onChange(option.value);
    closeList(true);
  }

  // Move focus into the list (or the search box) when it opens.
  useEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus();
  }, [open, searchable]);

  // Keep the highlighted option visible.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onBlur]);

  function typeahead(key: string) {
    const k = key.toLowerCase();
    const n = visible.length;
    for (let step = 1; step <= n; step++) {
      const index = (active + step) % n;
      if (visible[index].label.toLowerCase().startsWith(k)) {
        setActive(index);
        return;
      }
    }
  }

  function onListKeyDown(event: KeyboardEvent) {
    const n = visible.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => (n ? (i + 1) % n : 0));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => (n ? (i - 1 + n) % n : 0));
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(Math.max(0, n - 1));
        return;
      case "Enter": {
        event.preventDefault();
        const option = visible[active];
        if (option) choose(option);
        return;
      }
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeList(true);
        return;
      case "Tab":
        closeList(false);
        return;
      default:
        if (!searchable && event.key.length === 1 && /\S/.test(event.key)) typeahead(event.key);
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={clsx(
          "flex h-10 w-full items-center justify-between gap-2 border border-ink bg-surface px-3 text-left text-sm text-ink hover:border-primary disabled:bg-background aria-[invalid=true]:border-2 aria-[invalid=true]:border-error",
          className,
        )}
      >
        <span className={clsx("flex min-w-0 items-center gap-2 truncate", !(selected && selected.value !== "") && "text-muted")}>
          {selected && selected.value !== "" ? (renderValue ? renderValue(selected) : selected.label) : placeholder}
        </span>
        <Chevron />
      </button>

      {open ? (
        <div className={clsx("absolute left-0 top-full z-20 mt-1 min-w-full max-w-[90vw] border border-ink bg-surface", popoverClassName)}>
          {searchable ? (
            <div className="border-b border-accent p-2">
              <input
                ref={searchRef}
                type="text"
                aria-label="Search"
                aria-controls={listId}
                aria-activedescendant={visible.length ? optionId(active) : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onListKeyDown}
                placeholder="Search…"
                autoComplete="off"
                className="h-9 w-full border border-ink bg-surface px-2 text-sm text-ink placeholder:text-muted hover:border-primary"
              />
            </div>
          ) : null}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={searchable ? -1 : 0}
            aria-activedescendant={!searchable && visible.length ? optionId(active) : undefined}
            onKeyDown={searchable ? undefined : onListKeyDown}
            className="max-h-64 overflow-auto py-1"
          >
            {visible.length === 0 ? (
              <li role="presentation" className="px-3 py-2 text-sm text-muted">No results</li>
            ) : (
              visible.map((option, index) => (
                <li
                  key={option.value || "__empty"}
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={clsx(
                    "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink",
                    index === active && "bg-accent",
                    option.value === value && "font-semibold",
                  )}
                >
                  {option.value === "" ? (
                    <span className="text-muted">{option.label}</span>
                  ) : renderOption ? (
                    renderOption(option)
                  ) : (
                    option.label
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
import React from "react";

export type SelectOption = string | { value: string; label: string };
export const optValue = (o: SelectOption) => (typeof o === "string" ? o : o.value);
export const optLabel = (o: SelectOption) => (typeof o === "string" ? o : o.label);

/**
 * State + interaction logic for SearchableSelect: open/close (incl.
 * click-outside), the filter query, keyboard nav (↑/↓/Enter/Esc), and
 * focusing the search input on open. Kept separate from the component so
 * SearchableSelect.tsx stays render-only.
 */
export function useSearchableSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hi, setHi] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setHi(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) => optValue(o).toLowerCase().includes(q) || optLabel(o).toLowerCase().includes(q),
      )
    : options;

  const current = options.find((o) => optValue(o) === value);
  const currentLabel = current ? optLabel(current) : value || placeholder;

  const pick = (o: SelectOption) => {
    onChange?.(optValue(o));
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[hi];
      if (o) pick(o);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return {
    open,
    setOpen,
    query,
    setQuery,
    hi,
    setHi,
    ref,
    inputRef,
    filtered,
    current,
    currentLabel,
    pick,
    onKeyDown,
  };
}

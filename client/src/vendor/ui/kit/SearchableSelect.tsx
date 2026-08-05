import React from "react";
import { Icon } from "../icons";
import { optLabel, optValue, useSearchableSelect, type SelectOption } from "./useSearchableSelect";

/**
 * Searchable single-select — same options API as SelectInput, but with a filter
 * box + keyboard nav, for long lists (e.g. the 300+ OpenRouter models). Filters
 * by value and label; Enter selects, ↑/↓ move, Esc closes.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search…",
  mono = true,
  maxHeight = 280,
  id,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  mono?: boolean;
  maxHeight?: number;
  /** Explicit id for the trigger control, for FormField's htmlFor association. */
  id?: string;
}) {
  const { open, setOpen, query, setQuery, hi, setHi, ref, inputRef, filtered, current, currentLabel, pick, onKeyDown } =
    useSearchableSelect({ value, onChange, options, placeholder });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 12px",
          borderRadius: 7,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-elevated)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          className={mono ? "mono" : undefined}
          style={{
            flex: 1,
            fontSize: 14,
            color: current ? "var(--text-primary)" : "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentLabel}
        </span>
        <Icon.ChevronsUpDown size={14} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: 9,
            boxShadow: "var(--shadow-modal)",
            zIndex: 40,
            overflow: "hidden",
            animation: "ddpop .12s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <Icon.Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHi(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label={placeholder}
              className={mono ? "mono" : undefined}
              style={{
                flex: 1,
                fontSize: 14,
                color: "var(--text-primary)",
                background: "transparent",
                border: "none",
              }}
            />
          </div>
          <div role="listbox" style={{ maxHeight, overflowY: "auto", padding: 6 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "8px 10px", fontSize: 13, color: "var(--text-muted)" }}>
                No matches
              </div>
            )}
            {filtered.map((o, i) => {
              const v = optValue(o);
              const sel = v === value;
              const hot = i === hi;
              return (
                <button
                  key={v}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(o)}
                  className={mono ? "mono" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: hot ? "var(--bg-hover)" : "transparent",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <Icon.Check
                    size={13}
                    style={{ color: sel ? "var(--text-primary)" : "transparent", flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {optLabel(o)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

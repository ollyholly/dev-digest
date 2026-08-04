import React from "react";
import { Icon, type IconName } from "../icons";

export function Chip({
  children,
  active,
  onClick,
  icon,
  count,
  color,
  ...rest
}: {
  children?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: IconName;
  count?: number;
  color?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "color">) {
  const I = icon ? Icon[icon] : null;
  const [h, setH] = React.useState(false);
  return (
    <button
      type="button"
      // Chips are commonly used as toggle filters; default aria-pressed to
      // `active` (when provided) so callers don't have to re-fork this
      // primitive just to get accessible toggle semantics. Callers can still
      // override via an explicit aria-pressed in ...rest.
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        transition: "all .12s",
        border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
        background: active ? "var(--accent-bg)" : h ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--accent-text)" : h ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {I && <I size={13} style={color ? { color } : undefined} />}
      {children}
      {count != null && (
        <span className="tnum" style={{ opacity: 0.7, fontSize: 12 }}>
          {count}
        </span>
      )}
    </button>
  );
}

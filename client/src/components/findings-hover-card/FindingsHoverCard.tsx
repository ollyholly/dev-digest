"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import type { FindingRecord } from "@devdigest/shared";
import {
  CARD_MAX_HEIGHT,
  CARD_WIDTH,
  HOVER_OPEN_DELAY_MS,
} from "./constants";
import { FindingPopoverItem } from "./FindingPopoverItem";
import { popoverPosition, sortBySeverity } from "./helpers";

/**
 * Anchor + delayed hover/focus card listing findings. Callers own where
 * findings come from (in-memory or a lazy fetch gated on `onOpenChange`).
 */
export function FindingsHoverCard({
  findings,
  loading = false,
  onOpenChange,
  children,
  "aria-label": ariaLabel,
}: {
  findings: FindingRecord[] | undefined;
  loading?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const t = useTranslations("prReview.findings");
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; flipUp: boolean } | null>(
    null,
  );
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = React.useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const place = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(
      popoverPosition(
        { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, []);

  const setOpenState = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
      if (next) place();
    },
    [onOpenChange, place],
  );

  const scheduleOpen = React.useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpenState(true), HOVER_OPEN_DELAY_MS);
  }, [clearTimers, setOpenState]);

  const scheduleClose = React.useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpenState(false), 120);
  }, [clearTimers, setOpenState]);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenState(false);
    };
    const onScroll = () => place();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, place, setOpenState]);

  const sorted = React.useMemo(
    () => (findings ? sortBySeverity(findings) : []),
    [findings],
  );

  const label = ariaLabel ?? t("summary", { count: sorted.length });

  return (
    <span
      ref={anchorRef}
      role="group"
      tabIndex={0}
      aria-label={label}
      aria-expanded={open}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={scheduleOpen}
      onBlur={scheduleClose}
      onClick={(e) => {
        // Keep the row from navigating when interacting with the cell/card.
        e.stopPropagation();
        if (!open) setOpenState(true);
      }}
      style={{ display: "inline-flex", alignItems: "center", outline: "none" }}
    >
      {children}
      {open && pos && (
        <div
          role="dialog"
          aria-label={t("popover.heading", { count: sorted.length })}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            zIndex: 80,
            width: CARD_WIDTH,
            maxHeight: CARD_MAX_HEIGHT,
            left: pos.left,
            ...(pos.flipUp
              ? { bottom: window.innerHeight - pos.top, top: "auto" }
              : { top: pos.top }),
            overflow: "auto",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            boxShadow: "0 12px 40px rgba(0,0,0,.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderBottom: "1px solid var(--border)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              position: "sticky",
              top: 0,
              background: "var(--bg-elevated)",
            }}
          >
            <Icon.Info size={13} />
            {loading
              ? t("popover.loading")
              : t("popover.heading", { count: sorted.length })}
          </div>
          {loading ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--text-muted)" }}>
              {t("popover.loading")}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--text-muted)" }}>
              {t("popover.empty")}
            </div>
          ) : (
            sorted.map((f) => <FindingPopoverItem key={f.id} finding={f} />)
          )}
        </div>
      )}
    </span>
  );
}

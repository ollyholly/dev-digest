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
import { sortBySeverity } from "./helpers";
import { useHoverCard } from "./useHoverCard";

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
  const { anchorRef, open, pos, setOpenState, scheduleOpen, scheduleClose } =
    useHoverCard(onOpenChange);

  const sorted = React.useMemo(
    () => (findings ? sortBySeverity(findings) : []),
    [findings],
  );

  const label = ariaLabel ?? t("summary", { count: sorted.length });

  return (
    <span
      ref={anchorRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-expanded={open}
      onMouseEnter={() => scheduleOpen(HOVER_OPEN_DELAY_MS)}
      onMouseLeave={scheduleClose}
      onFocus={() => scheduleOpen(HOVER_OPEN_DELAY_MS)}
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
          onMouseEnter={() => scheduleOpen(HOVER_OPEN_DELAY_MS)}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            zIndex: 80,
            width: CARD_WIDTH,
            maxWidth: "min(360px, calc(100vw - 16px))",
            maxHeight: CARD_MAX_HEIGHT,
            left: pos.left,
            ...(pos.flipUp
              ? { bottom: window.innerHeight - pos.top, top: "auto" }
              : { top: pos.top }),
            // Vertical only — horizontal scroll + the light scrollbar-corner
            // square come from long file:line paths overflowing the card.
            overflowX: "hidden",
            overflowY: "auto",
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

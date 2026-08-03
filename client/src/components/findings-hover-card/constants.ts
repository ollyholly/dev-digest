import type { Severity } from "@devdigest/shared";

/** Worst-first order for badges and hover-card sorting. */
export const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  WARNING: 1,
  SUGGESTION: 2,
};

export const SEVERITY_LEVELS: Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

/** Delay before opening the hover card (and gating any lazy fetch). */
export const HOVER_OPEN_DELAY_MS = 220;

export const CARD_WIDTH = 360;
export const CARD_GAP = 8;
export const CARD_MAX_HEIGHT = 320;

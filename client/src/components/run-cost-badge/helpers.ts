/** Empty placeholder when cost is unknown — never render "$0.00". */
export const COST_EMPTY = "—";

/**
 * Format a USD cost for the Run Cost Badge.
 * List/sidebar mock uses 3 decimals ($0.014); timeline uses 4 for sub-cent
 * amounts ($0.0013).
 */
export function formatUsd(costUsd: number | null | undefined): string {
  if (costUsd == null || Number.isNaN(costUsd)) return COST_EMPTY;
  const digits = Math.abs(costUsd) > 0 && Math.abs(costUsd) < 0.01 ? 4 : 3;
  return `$${costUsd.toFixed(digits)}`;
}

/** Locale-formatted token count (e.g. 9119 → "9,119"). */
export function formatTokCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

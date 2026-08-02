/* RunCostBadge — compact USD cost (PR list / sidebar) or tokens · cost
   (timeline). Null cost → em dash, never "$0.00". */
"use client";

import React from "react";
import { COST_EMPTY, formatTokCount, formatUsd } from "./helpers";

export type RunCostBadgeVariant = "compact" | "withTokens";

export function RunCostBadge({
  costUsd,
  tokensIn,
  tokensOut,
  variant = "compact",
  className,
  style,
}: {
  costUsd: number | null | undefined;
  tokensIn?: number | null;
  tokensOut?: number | null;
  variant?: RunCostBadgeVariant;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cost = formatUsd(costUsd);
  if (variant === "compact") {
    return (
      <span className={className ?? "mono tnum"} style={style}>
        {cost}
      </span>
    );
  }

  if (cost === COST_EMPTY) {
    return (
      <span className={className ?? "mono tnum"} style={style}>
        {COST_EMPTY}
      </span>
    );
  }

  const inTok = tokensIn ?? 0;
  const outTok = tokensOut ?? 0;
  const total = inTok + outTok;
  const label =
    total > 0 ? `${formatTokCount(total)} tok  ·  ${cost}` : cost;

  return (
    <span className={className ?? "mono tnum"} style={style}>
      {label}
    </span>
  );
}

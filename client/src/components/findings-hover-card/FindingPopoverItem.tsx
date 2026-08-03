"use client";

import React from "react";
import { Icon, CategoryTag, SEV, type Category, type Severity } from "@devdigest/ui";
import type { FindingRecord } from "@devdigest/shared";
import { confidencePct, fileLineLabel } from "./helpers";

export function FindingPopoverItem({ finding }: { finding: FindingRecord }) {
  const sev = (finding.severity as Severity) in SEV ? (finding.severity as Severity) : "SUGGESTION";
  const meta = SEV[sev];
  const I = Icon[meta.icon];
  return (
    <div
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <I size={14} style={{ color: meta.c, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              wordBreak: "break-word",
            }}
          >
            {finding.title}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              fontSize: 11.5,
              color: "var(--text-muted)",
              minWidth: 0,
              maxWidth: "100%",
            }}
          >
            <CategoryTag category={finding.category as Category} />
            <span
              className="mono"
              title={fileLineLabel(finding)}
              style={{
                color: "var(--accent)",
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fileLineLabel(finding)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--ok)",
                  display: "inline-block",
                }}
              />
              {confidencePct(finding.confidence)} conf
            </span>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {finding.rationale}
          </div>
        </div>
      </div>
    </div>
  );
}

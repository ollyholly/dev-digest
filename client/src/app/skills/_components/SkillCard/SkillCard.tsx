"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, Badge, Toggle } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useDeleteSkill } from "../../../../lib/hooks/skills";
import { TYPE_COLOR, TYPE_ICON } from "./constants";
import { s } from "./styles";

export interface SkillCardStats {
  agentsCount: number;
  /** 0-100, null when not enough run history to compute (per-skill stats aren't built yet). */
  pullRate: number | null;
  acceptRate: number | null;
}

export function SkillCard({
  skill,
  active,
  stats,
  onClick,
  onToggle,
}: {
  skill: Skill;
  active?: boolean;
  stats?: SkillCardStats;
  onClick?: () => void;
  onToggle?: (enabled: boolean) => void;
}) {
  const t = useTranslations("skills");
  const del = useDeleteSkill();
  const color = TYPE_COLOR[skill.type];
  const TypeIcon = Icon[TYPE_ICON[skill.type]];
  const needsVetting = skill.source !== "manual" && !skill.enabled;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={s.card(!!active, skill.enabled)}
    >
      <div style={s.headerRow}>
        <div style={{ ...s.iconBox, background: color + "1a", color }}>
          <TypeIcon size={15} />
        </div>
        <span className="mono" style={s.name}>
          {skill.name}
        </span>
        {onToggle && (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Toggle
              on={skill.enabled}
              onChange={onToggle}
              size={14}
              aria-label={`${skill.enabled ? "Disable" : "Enable"} skill "${skill.name}"`}
            />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete skill "${skill.name}"? This cannot be undone.`)) del.mutate(skill.id);
          }}
          disabled={del.isPending}
          title="Delete skill"
          aria-label="Delete skill"
          style={{
            background: "none",
            border: "none",
            cursor: del.isPending ? "not-allowed" : "pointer",
            color: "var(--text-muted)",
            display: "inline-flex",
            padding: 4,
          }}
        >
          <Icon.Trash size={14} style={del.isPending ? { animation: "ddspin 1s linear infinite" } : undefined} />
        </button>
      </div>
      <div style={s.description}>{skill.description || "No description"}</div>
      <div style={s.badgeRow}>
        <Badge color={color} bg={color + "1a"}>
          {t(`listItem.type.${skill.type}`)}
        </Badge>
        <span title={needsVetting ? t("listItem.vettingTitle") : undefined}>
          <Badge
            color={needsVetting ? "var(--warn)" : "var(--text-muted)"}
            bg={needsVetting ? "var(--warn-bg)" : undefined}
            icon={needsVetting ? "AlertTriangle" : undefined}
          >
            {t(`listItem.source.${skill.source}`)}
            {needsVetting ? ` · ${t("listItem.needsVetting")}` : ""}
          </Badge>
        </span>
      </div>
      {stats && (
        <div style={s.statsRow}>
          <span>{t("page.card.agentsCount", { count: stats.agentsCount })}</span>
          <span>·</span>
          <span>{stats.pullRate != null ? t("page.card.pull", { pct: stats.pullRate }) : t("page.card.noStats")}</span>
          <span>·</span>
          <span>
            {stats.acceptRate != null ? t("page.card.accept", { pct: stats.acceptRate }) : t("page.card.noStats")}
          </span>
        </div>
      )}
    </div>
  );
}
